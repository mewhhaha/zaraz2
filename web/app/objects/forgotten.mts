import { DurableObject } from "cloudflare:workers";
import type { Env } from "@mewhhaha/fx-router";
import { Resend } from "resend";

const EMAIL_EXPIRATION = 1000 * 60 * 60 * 3;

export class DurableObjectForgotten extends DurableObject<Env> {
  email: string = "";
  username: string = "";

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    state.blockConcurrencyWhile(async () => {
      const email = await this.ctx.storage.get<string>("email");
      const username = await this.ctx.storage.get<string>("username");

      if (email) {
        this.email = email;
      }
      if (username) {
        this.username = username;
      }
    });
  }

  async create(email: string, username: string) {
    if (this.email !== undefined || this.username !== undefined) {
      return { error: true, message: "already_sent" } as const;
    }

    this.email = email;
    this.username = username;

    void this.ctx.storage.put("email", email);
    void this.ctx.storage.put("username", username);

    const resend = new Resend(this.env.RESEND_API_KEY);

    const href = `${this.env.ORIGIN}/auth/forgotten/${this.ctx.id}`;
    const { data, error } = await resend.emails.send({
      from: "zaraz@zaraz.app",
      to: [email],
      subject: "Register a new passkey",
      html: `<a href="${href}">${href}</a>`,
    });

    if (error) {
      return { error: true, message: "failed_to_send" } as const;
    }

    if (data?.id === undefined) {
      return { error: true, message: "failed_to_send" } as const;
    }

    this.ctx.storage.setAlarm(Date.now() + EMAIL_EXPIRATION);

    return { error: false, id: data.id } as const;
  }

  async destroy() {
    if (this.email === undefined || this.username === undefined) {
      return { error: true, message: "missing_email" } as const;
    }

    this.ctx.storage.deleteAll();
    const email = this.email;
    const username = this.username;

    return { error: false, email, username } as const;
  }

  alarm() {
    this.ctx.storage.deleteAll();
    this.email = "";
    this.username = "";
  }
}
