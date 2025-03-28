import type { Env } from "@mewhhaha/fx-router";
import { DurableObject, RpcTarget } from "cloudflare:workers";

type PasskeyLink = {
  name: string;
  credentialId: string;
  userId: string;
  passkeyId: string;
};

export type Metadata = {
  username: string;
};

export type Recovery = {
  emails: { address: string; verified: boolean; primary: boolean }[];
  attempts: Date[];
};

const ATTEMPT_LIMIT = 3;
const ATTEMPT_INTERVAL = 1000 * 60 * 5;
const BUCKET_SIZE = 100;

type Task = {
  id: string;
  text: string;
  created: Date;
  completed: Date | undefined;
};

type History = {
  bucket: number;
  size: number;
};

export class DurableObjectUser extends DurableObject<Env> {
  private metadata: Metadata | undefined = undefined;
  private recovery: Recovery = { emails: [], attempts: [] };
  private passkeys: PasskeyLink[] = [];
  private tasks: Task[] = [];
  private history: History = { bucket: 0, size: 0 };

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    void state.blockConcurrencyWhile(async () => {
      const load = async (
        key: "metadata" | "recovery" | "passkeys" | "tasks" | "history",
      ) => {
        const value = await this.ctx.storage.get(key);
        if (value !== undefined) {
          // @ts-expect-error we can't see private variables
          this[key] = value;
        }
      };
      await Promise.all([
        load("metadata"),
        load("recovery"),
        load("passkeys"),
        load("tasks"),
        load("history"),
      ]);
    });
  }

  async listTasks() {
    return {
      error: false,
      tasks: this.tasks,
      completed: this.history.bucket * BUCKET_SIZE + this.history.size,
    } as const;
  }

  async addTask(text: string) {
    this.tasks = [
      {
        id: crypto.randomUUID(),
        text,
        created: new Date(),
        completed: undefined,
      },
      ...this.tasks,
    ];
    void this.ctx.storage.put("tasks", this.tasks);
  }

  async completeTask(id: string) {
    const task = this.tasks.find((t) => t.id === id);
    if (task === undefined) {
      return { error: true, message: "missing_task" } as const;
    }
    task.completed = new Date();
    this.tasks = this.tasks.filter((t) => t.id !== id);
    void this.ctx.storage.put("tasks", this.tasks);

    const historyKey = `history#${this.history.bucket}`;
    let next = await this.ctx.storage.get<Task[]>(historyKey);
    if (next === undefined) {
      next = [];
    }
    next.push(task);
    this.ctx.storage.put(historyKey, next);

    this.history.size += 1;
    if (this.history.size >= BUCKET_SIZE) {
      this.history.bucket += 1;
      this.history.size = 0;
    }

    void this.ctx.storage.put("history", this.history);
    return { error: false, tasks: this.tasks } as const;
  }

  async cycleTasks() {
    this.tasks = [
      this.tasks[this.tasks.length - 1],
      ...this.tasks.slice(0, -1),
    ];
    void this.ctx.storage.put("tasks", this.tasks);

    return { error: false, tasks: this.tasks } as const;
  }

  async exists() {
    try {
      await this.assertUser();
      return true;
    } catch {
      return false;
    }
  }

  async create({
    email,
    passkey,
    username,
  }: Metadata & { email: string; passkey?: PasskeyLink }) {
    await this.assertEmpty();

    this.metadata = { username };
    void this.ctx.storage.put("metadata", this.metadata);
    if (email !== undefined) {
      this.recovery = {
        emails: [{ address: email, verified: false, primary: true }],
        attempts: [],
      };
      void this.ctx.storage.put("recovery", this.recovery);
    }
    if (passkey !== undefined) {
      this.passkeys = [passkey];
      void this.ctx.storage.put("passkeys", this.passkeys);
    }
  }

  async data() {
    return await this.assertUser();
  }

  async verifyEmail(unverifiedEmail: string) {
    await this.assertUser();

    const { emails, attempts } = this.recovery;
    const email = emails.find((e) => e.address === unverifiedEmail);
    if (email === undefined) {
      return { error: true, message: "missing_email" } as const;
    }

    email.verified = true;
    this.recovery = { emails, attempts };
    void this.ctx.storage.put("recovery", this.recovery);

    return { error: false } as const;
  }

  async attemptRecovery() {
    const { emails, attempts: oldAttempts } = this.recovery;

    const attempts = oldAttempts.filter((a) => {
      const now = new Date();
      return now.getTime() - a.getTime() < ATTEMPT_INTERVAL;
    });

    if (attempts.length >= ATTEMPT_LIMIT) {
      return { error: true, message: "attempt_limit_reached" } as const;
    }

    attempts.push(new Date());
    this.recovery = { emails, attempts };
    void this.ctx.storage.put("recovery", this.recovery);

    const email = emails.find((e) => e.primary)?.address;
    if (email === undefined) {
      return { error: true, message: "missing_email" } as const;
    }

    return {
      error: false,
      email,
    } as const;
  }

  async addPasskey(link: PasskeyLink) {
    const { passkeys } = await this.assertUser();
    const added = [...passkeys, link];

    this.passkeys = added;
    void this.ctx.storage.put("passkeys", this.passkeys);
    return { passkeys: added };
  }

  async getPasskey(passkeyId: string) {
    const { passkeys } = await this.assertUser();
    const passkey = passkeys.find((p) => p.passkeyId === passkeyId);
    if (!passkey) {
      throw new Error(`Missing passkey with id ${passkeyId}`);
    }

    const rename = async (name: string) => {
      passkey.name = name;
      this.passkeys = passkeys;
      void this.ctx.storage.put("passkeys", this.passkeys);

      return { passkeys } as const;
    };

    const remove = async () => {
      const removed = passkeys.filter((p) => p.passkeyId !== passkeyId);
      if (removed.length === passkeys.length) {
        return { error: true, message: "missing_passkey" } as const;
      }

      const passkeyIdFromString =
        this.env.OBJECT_PASSKEY.idFromString(passkeyId);
      const passkey = this.env.OBJECT_PASSKEY.get(passkeyIdFromString);

      this.ctx.waitUntil(passkey.destruct());

      this.passkeys = removed;
      void this.ctx.storage.put("passkeys", this.passkeys);

      return { error: false, passkey: removed } as const;
    };

    class RpcTargetPasskey extends RpcTarget {
      rename = rename;
      remove = remove;
    }

    return new RpcTargetPasskey();
  }

  private async assertUser() {
    const metadata = this.metadata;
    const recovery = this.recovery;
    const passkeys = this.passkeys;
    if (metadata === undefined) {
      throw new Error("Object is unoccupied");
    }

    return { metadata, recovery, passkeys };
  }

  private async assertEmpty() {
    if (this.metadata !== undefined) {
      throw new Error("Object is occupied");
    }
  }
}

export const makePasskeyLink = ({
  passkeyId,
  credentialId,
  userId,
}: {
  passkeyId: DurableObjectId | string;
  credentialId: string;
  userId: DurableObjectId | string;
}): PasskeyLink => {
  const passkeyIdString = passkeyId.toString();
  return {
    passkeyId: passkeyIdString,
    credentialId,
    userId: userId.toString(),
    name: `passkey-${passkeyIdString.slice(0, 3) + passkeyIdString.slice(-3)}`,
  };
};
