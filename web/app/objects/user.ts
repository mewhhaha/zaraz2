import type { Env } from "@mewhhaha/ruwuter";
import { DurableObject, RpcTarget } from "cloudflare:workers";
import { createStore, DurableStore } from "../helpers/store";
import type { TaskEvent } from "../helpers/task-events";

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

const EVENT_BUCKET_SIZE = 200;
const SNAPSHOT_INTERVAL = 400;

export type Task = {
  id: string;
  text: string;
  created: Date;
  completed: Date | undefined;
};

type UserStore = {
  "#account": Account;
  "#eventCount": number;
  "#lastSeqByClient": Record<string, number>;
  "#snapshot": TaskState;
  "#snapshotCursor": number;
};

export class DurableObjectUser extends DurableObject<Env> {
  private readonly store: DurableStore<UserStore>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.store = createStore(state.storage, {
      "#account": () => state.storage.get<Account>("#account"),
      "#eventCount": async () =>
        (await state.storage.get<number>("#eventCount")) ?? 0,
      "#lastSeqByClient": async () =>
        (await state.storage.get<Record<string, number>>("#lastSeqByClient")) ??
        {},
      "#snapshot": async () =>
        (await state.storage.get<TaskState>("#snapshot")) ?? {
          tasks: [],
          completed: 0,
        },
      "#snapshotCursor": async () =>
        (await state.storage.get<number>("#snapshotCursor")) ?? 0,
    });
  }

  async listTasks() {
    const { tasks, completed } = await this.replayEvents();

    return {
      current: tasks.at(-1),
      completed,
    } as const;
  }

  async applyEvents(events: TaskEvent[]) {
    await this.appendEvents(events);
    return this.listTasks();
  }

  private async appendEvents(events: TaskEvent[]) {
    if (events.length === 0) {
      return;
    }

    const [count, lastSeqByClient, snapshotCursor] = await Promise.all([
      this.store.get("#eventCount"),
      this.store.get("#lastSeqByClient"),
      this.store.get("#snapshotCursor"),
    ]);

    const nextSeqByClient = { ...lastSeqByClient };
    let seqDirty = false;
    let nextCount = count;
    let bucketIndex = Math.floor(nextCount / EVENT_BUCKET_SIZE);
    let bucket =
      (await this.ctx.storage.get<TaskEvent[]>(eventBucketKey(bucketIndex))) ??
      [];
    let bucketDirty = false;

    for (const event of events) {
      const lastSeq = nextSeqByClient[event.clientId] ?? 0;
      if (event.seq <= lastSeq) {
        continue;
      }
      nextSeqByClient[event.clientId] = event.seq;
      seqDirty = true;

      bucket.push(event);
      bucketDirty = true;
      nextCount += 1;

      if (bucket.length >= EVENT_BUCKET_SIZE) {
        await this.ctx.storage.put(eventBucketKey(bucketIndex), bucket);
        bucketIndex += 1;
        bucket = [];
        bucketDirty = false;
      }
    }

    if (bucketDirty) {
      await this.ctx.storage.put(eventBucketKey(bucketIndex), bucket);
    }

    if (nextCount !== count) {
      await this.store.set("#eventCount", nextCount);
    }

    if (seqDirty) {
      await this.store.set("#lastSeqByClient", nextSeqByClient);
    }

    if (
      nextCount !== count &&
      nextCount - snapshotCursor >= SNAPSHOT_INTERVAL
    ) {
      const state = await this.replayEvents();
      await Promise.all([
        this.store.set("#snapshot", state),
        this.store.set("#snapshotCursor", nextCount),
      ]);
    }
  }

  private async replayEvents(): Promise<TaskState> {
    await this.migrateLegacyTasks();
    const [count, snapshot, cursor] = await Promise.all([
      this.store.get("#eventCount"),
      this.store.get("#snapshot"),
      this.store.get("#snapshotCursor"),
    ]);
    const state: TaskState = {
      tasks: snapshot.tasks.map((task) => ({
        ...task,
        created: new Date(task.created),
        completed: task.completed ? new Date(task.completed) : undefined,
      })),
      completed: snapshot.completed,
    };
    const start = Math.min(cursor, count);
    const events = await replayEventsSince(this.ctx.storage, start, count);
    for (const event of events) {
      applyTaskEvent(state, event);
    }
    return state;
  }

  private async migrateLegacyTasks() {
    const existing = await this.store.get("#eventCount");
    if (existing > 0) {
      return;
    }

    const [legacyTasks, legacyCompleted] = await Promise.all([
      this.ctx.storage.get<Map<string, Task>>("#tasks"),
      this.ctx.storage.get<number>("#completed"),
    ]);

    if (!legacyTasks && !legacyCompleted) {
      return;
    }

    const events: TaskEvent[] = [];
    let seq = 0;
    const nextSeq = () => {
      seq += 1;
      return seq;
    };

    if (legacyTasks) {
      for (const task of legacyTasks.values()) {
        const createdAt =
          task.created instanceof Date ? task.created.getTime() : Date.now();
        events.push({
          id: crypto.randomUUID(),
          clientId: "migration",
          seq: nextSeq(),
          ts: createdAt,
          type: "task.add",
          taskId: task.id,
          text: task.text,
        });
      }
    }

    if (legacyCompleted && legacyCompleted > 0) {
      events.push({
        id: crypto.randomUUID(),
        clientId: "migration",
        seq: nextSeq(),
        ts: Date.now(),
        type: "task.completed.set",
        count: legacyCompleted,
      });
    }

    if (events.length > 0) {
      await this.appendEvents(events);
    }

    await Promise.all([
      this.ctx.storage.delete("#tasks"),
      this.ctx.storage.delete("#completed"),
    ]);
  }

  async exists() {
    return this.store.get("#account").then(
      () => true,
      () => false,
    );
  }

  async create(account: Account) {
    if (await this.exists()) {
      return "user_exists" as const;
    }

    await this.store.set("#account", account);
    await this.store.set("#eventCount", 0);
    await this.store.set("#lastSeqByClient", {});
    await this.store.set("#snapshot", { tasks: [], completed: 0 });
    await this.store.set("#snapshotCursor", 0);
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

const eventBucketKey = (bucket: number) => `events#${bucket}`;

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

type TaskState = {
  tasks: Task[];
  completed: number;
};

const applyTaskEvent = (state: TaskState, event: TaskEvent) => {
  if (event.type === "task.add") {
    state.tasks.push({
      id: event.taskId,
      text: event.text,
      created: new Date(event.ts),
      completed: undefined,
    });
    return;
  }

  if (event.type === "task.cycle") {
    if (state.tasks.length > 1) {
      const last = state.tasks.pop();
      if (last) {
        state.tasks.unshift(last);
      }
    }
    return;
  }

  if (event.type === "task.done") {
    if (state.tasks.length === 0) {
      return;
    }

    const index =
      event.taskId !== undefined
        ? state.tasks.findIndex((task) => task.id === event.taskId)
        : state.tasks.length - 1;

    if (index < 0) {
      return;
    }

    const [task] = state.tasks.splice(index, 1);
    if (task) {
      task.completed = new Date(event.ts);
      state.completed += 1;
    }
    return;
  }

  if (event.type === "task.completed.set") {
    if (event.count > state.completed) {
      state.completed = event.count;
    }
  }
};

const replayEventsSince = async (
  storage: DurableObjectState["storage"],
  start: number,
  count: number,
): Promise<TaskEvent[]> => {
  if (count === 0 || start >= count) {
    return [];
  }

  const startBucket = Math.floor(start / EVENT_BUCKET_SIZE);
  const endBucket = Math.floor((count - 1) / EVENT_BUCKET_SIZE);
  const keys = Array.from({ length: endBucket - startBucket + 1 }, (_, index) =>
    eventBucketKey(startBucket + index),
  );

  const buckets = await Promise.all(
    keys.map(async (key) => (await storage.get<TaskEvent[]>(key)) ?? []),
  );

  const all = buckets.flat();
  const offset = start - startBucket * EVENT_BUCKET_SIZE;
  return all.slice(offset, offset + (count - start));
};
