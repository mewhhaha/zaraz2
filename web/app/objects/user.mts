import type { Env } from "@mewhhaha/fx-router";
import { DurableObject } from "cloudflare:workers";
import { store } from "../helpers/store";

type PasskeyLink = {
  name: string;
  credentialId: string;
  userId: string;
  passkeyId: string;
  createdAt: Date;
  lastUsedAt: Date;
};

export type Metadata = {
  username: string;
};

const BUCKET_SIZE = 100;
const ATTEMPT_LIMIT = 3;
const ATTEMPT_INTERVAL = 1000 * 60 * 5;

type Task = {
  id: string;
  text: string;
  created: Date;
  completed: Date | undefined;
};

type Account = {
  username: string;
  passkeys: PasskeyLink[];
  recovery: {
    email?: string;
    attempts: Date[];
  };
};

export class DurableObjectUser extends DurableObject<Env> {
  @store
  accessor #account: Promise<Account>;

  @store
  accessor #tasks: Promise<Map<string, Task>>;

  @store
  accessor #completed: Promise<number>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    const read = async <T,>(key: string): Promise<T> => {
      const v = await state.storage.get<T>(key);
      if (v === undefined) {
        return Promise.reject("Missing " + key);
      }
      return v;
    };

    this.#account = read("#account");
    this.#tasks = read("#tasks");
    this.#completed = read("#completed");
  }

  async listTasks() {
    const tasks = await this.#tasks;
    const completed = await this.#completed;

    return {
      current: [...tasks.values()].at(-1),
      completed,
    } as const;
  }

  async addTask(text: string) {
    const tasks = await this.#tasks;
    const id = crypto.randomUUID();
    tasks.set(id, {
      id,
      text,
      created: new Date(),
      completed: undefined,
    });
    this.#tasks = Promise.resolve(tasks);

    return { next: [...tasks].at(-1) } as const;
  }

  async completeTask(id: string) {
    const tasks = await this.#tasks;
    const task = tasks.get(id);
    if (task === undefined) {
      return { error: true, message: "missing_task" } as const;
    }
    task.completed = new Date();
    tasks.delete(id);
    this.#tasks = Promise.resolve(tasks);

    const completed = await this.#completed;
    const historyKey = createHistoryKey(completed);
    let next = await this.ctx.storage.get<Task[]>(historyKey);
    next ??= [];
    next.push(task);
    this.ctx.storage.put(historyKey, next);

    this.#completed = Promise.resolve(completed + 1);
    return { error: false, next: [...tasks].at(-1) } as const;
  }

  async cycleTasks() {
    const tasks = [...(await this.#tasks)];
    const first = tasks.pop();
    if (first) {
      tasks.unshift(first);
    }

    this.#tasks = Promise.resolve(new Map(tasks));
    return { error: false, next: tasks.at(-1) } as const;
  }

  async exists() {
    try {
      await this.#account;
      return true;
    } catch {
      return false;
    }
  }

  async create(account: Account) {
    try {
      await this.#account;
      return "user_exists" as const;
    } catch {
      this.#account = Promise.resolve(account);
      this.#completed = Promise.resolve(0);
      this.#tasks = Promise.resolve(new Map());
      return account;
    }
  }

  async data() {
    const account = await this.#account;
    return {
      account,
    } as const;
  }

  async link(passkeyLink: PasskeyLink) {
    const account = await this.#account;
    account.passkeys.push(passkeyLink);
    this.#account = Promise.resolve(account);
  }

  async used(passkeyId: string) {
    const account = await this.#account;
    const passkey = account.passkeys.find((p) => p.passkeyId === passkeyId);
    if (passkey) {
      passkey.lastUsedAt = new Date();
    }
    this.#account = Promise.resolve(account);
  }

  async email(email: string) {
    const account = await this.#account;
    account.recovery.email = email;
    this.#account = Promise.resolve(account);
  }

  async recover() {
    const account = await this.#account;
    const email = account.recovery.email;
    if (!email) {
      return "no_recovery_email" as const;
    }

    account.recovery.attempts = account.recovery.attempts.filter((attempt) => {
      const diff = Date.now() - attempt.getTime();
      return diff < ATTEMPT_INTERVAL;
    });
    this.#account = Promise.resolve(account);
    if (account.recovery.attempts.length >= ATTEMPT_LIMIT) {
      return "too_many_attempts" as const;
    }
    return { email } as const;
  }
}

const createHistoryKey = (completed: number) => {
  const bucket = (completed / BUCKET_SIZE) | 0;
  return `history#${bucket}`;
};

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
  const date = new Date();
  return {
    passkeyId: passkeyIdString,
    credentialId,
    userId: userId.toString(),
    createdAt: date,
    lastUsedAt: date,
    name: `passkey-${passkeyIdString.slice(0, 3) + passkeyIdString.slice(-3)}`,
  };
};
