import type { Env } from "@mewhhaha/ruwuter";
import { DurableObject, RpcTarget } from "cloudflare:workers";
import { createStore, DurableStore } from "../helpers/store";

type PasskeyLink = {
  name: string;
  credentialId: string;
  username: string;
  passkeyId: string;
  createdAt: Date;
  lastUsedAt: Date;
};

export type Account = {
  username: string;
  passkeys: PasskeyLink[];
};

const BUCKET_SIZE = 100;

export type Task = {
  id: string;
  text: string;
  created: Date;
  completed: Date | undefined;
};

type UserStore = {
  "#account": Account;
  "#tasks": Map<string, Task>;
  "#completed": number;
};

export class DurableObjectUser extends DurableObject<Env> {
  private readonly store: DurableStore<UserStore>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.store = createStore(state.storage, {
      "#account": () => state.storage.get<Account>("#account"),
      "#tasks": async () =>
        (await state.storage.get<Map<string, Task>>("#tasks")) ?? new Map(),
      "#completed": async () =>
        (await state.storage.get<number>("#completed")) ?? 0,
    });
  }

  async listTasks() {
    const tasks = await this.store.get("#tasks");
    const completed = await this.store.get("#completed");

    return {
      current: [...tasks.values()].at(-1),
      completed,
    } as const;
  }

  async addTask(text: string) {
    const tasks = await this.store.get("#tasks");
    const id = crypto.randomUUID();
    tasks.set(id, {
      id,
      text,
      created: new Date(),
      completed: undefined,
    });
    await this.store.set("#tasks", tasks);

    return { next: [...tasks].at(-1) } as const;
  }

  async completeTask(id: string) {
    const tasks = await this.store.get("#tasks");
    const task = tasks.get(id);
    if (task === undefined) {
      return { error: true, message: "missing_task" } as const;
    }
    task.completed = new Date();
    tasks.delete(id);
    await this.store.set("#tasks", tasks);

    const completed = await this.store.get("#completed");
    const historyKey = createHistoryKey(completed);
    let next = await this.ctx.storage.get<Task[]>(historyKey);
    next ??= [];
    next.push(task);
    await this.ctx.storage.put(historyKey, next);

    await this.store.set("#completed", completed + 1);
    return { error: false, next: [...tasks].at(-1) } as const;
  }

  async cycleTasks() {
    const tasks = [...(await this.store.get("#tasks"))];
    const first = tasks.pop();
    if (first) {
      tasks.unshift(first);
    }

    const next = new Map(tasks);
    await this.store.set("#tasks", next);
    return { error: false, next: tasks.at(-1) } as const;
  }

  async exists() {
    return this.store.get("#account").then(
      () => true,
      () => false,
    );
  }

  async create(account: Account) {
    const exists = await this.store.get("#account").then(
      () => true,
      () => false,
    );
    if (exists) {
      return "user_exists" as const;
    }

    await this.store.set("#account", account);
    await this.store.set("#completed", 0);
    await this.store.set("#tasks", new Map());
    return account;
  }

  async account() {
    const that = this;
    class AccountRpc extends RpcTarget {
      async data() {
        return that.store.get("#account");
      }

      async link(passkeyLink: PasskeyLink) {
        const account = await that.store.get("#account");
        account.passkeys.unshift(passkeyLink);
        await that.store.set("#account", account);
        return { passkeys: account.passkeys };
      }

      async rename(passkeyId: string, name: string) {
        const account = await that.store.get("#account");
        const passkey = account.passkeys.find((p) => p.passkeyId === passkeyId);
        if (passkey) {
          passkey.name = name;
        }
        await that.store.set("#account", account);
        return { passkeys: account.passkeys };
      }

      async remove(passkeyId: string) {
        const account = await that.store.get("#account");
        account.passkeys = account.passkeys.filter(
          (p) => p.passkeyId !== passkeyId,
        );
        await that.store.set("#account", account);
        return { passkeys: account.passkeys };
      }

      async used(passkeyId: string) {
        const account = await that.store.get("#account");
        const passkey = account.passkeys.find((p) => p.passkeyId === passkeyId);
        if (passkey) {
          passkey.lastUsedAt = new Date();
        }
        await that.store.set("#account", account);
      }
    }
    return new AccountRpc();
  }
}

const createHistoryKey = (completed: number) => {
  const bucket = (completed / BUCKET_SIZE) | 0;
  return `history#${bucket}`;
};

export const makePasskeyLink = ({
  passkeyId,
  credentialId,
  username,
}: {
  passkeyId: DurableObjectId | string;
  credentialId: string;
  username: string;
}): PasskeyLink => {
  const passkeyIdString = passkeyId.toString();
  const date = new Date();
  return {
    passkeyId: passkeyIdString,
    credentialId,
    username,
    createdAt: date,
    lastUsedAt: date,
    name: `passkey-${passkeyIdString.slice(0, 3) + passkeyIdString.slice(-3)}`,
  };
};
