import { DurableObject } from "cloudflare:workers";
import type { Env } from "@mewhhaha/fx-router";

const EMAIL_EXPIRATION = 1000 * 60 * 60 * 3;

export class DurableObjectForgotten extends DurableObject<Env> {
  private email: string = "";
  private username: string = "";

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
    if (this.email || this.username) {
      return { error: true, message: "already_sent" } as const;
    }

    this.email = email;
    this.username = username;

    void this.ctx.storage.put("email", email);
    void this.ctx.storage.put("username", username);

    const resend = createResend(this.env.RESEND_API_KEY);

    const href = `${this.env.ORIGIN}/auth/forgotten/${this.ctx.id}`;
    try {
      await resend.send({
        from: "support@zaraz2.app",
        to: [email],
        subject: "Register a new passkey",
        html: `<a href="${href}">${href}</a>`,
      });
    } catch {
      return { error: true, message: "failed_to_send" } as const;
    }

    this.ctx.storage.setAlarm(Date.now() + EMAIL_EXPIRATION);

    return { error: false } as const;
  }

  async data() {
    return {
      email: this.email,
      username: this.username,
    };
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

const createResend = (apiKey: string) => {
  const send = async ({
    from,
    to,
    subject,
    html,
  }: {
    from: string;
    to: string[];
    subject: string;
    html: string;
  }) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      console.error(
        `Failed to send email, status: ${response.status}, message: ${await response.text()}`,
      );
      throw new Error("Failed to send email");
    }

    return response.json<{ id: string }>();
  };

  return { send };
};
