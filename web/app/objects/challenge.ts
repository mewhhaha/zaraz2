import { DurableObject } from "cloudflare:workers";
import type { Env } from "@mewhhaha/ruwuter";
import { createStore, DurableStore } from "../helpers/store";

export type Finish<T> =
  | { state: T }
  | "challenge_not_found"
  | "challenge_expired";

const CHALLENGE_TTL_MS = 1000 * 60 * 10;

type ChallengeStore = {
  "#data": unknown;
  "#createdAt": string;
};

export class DurableObjectChallenge extends DurableObject<Env> {
  private readonly store: DurableStore<ChallengeStore>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.store = createStore(state.storage, {
      "#data": () => state.storage.get<unknown>("#data"),
      "#createdAt": () => state.storage.get<string>("#createdAt"),
    });
  }

  async save(state: unknown) {
    const exists = await this.store.get("#data").then(
      () => true,
      () => false,
    );
    if (exists) {
      return "challenge_exists" as const;
    }

    await this.store.set("#data", state);
    const createdAt = new Date().toISOString();
    await this.store.set("#createdAt", createdAt);
    const expires = new Date(Date.now() + CHALLENGE_TTL_MS);
    await this.ctx.storage.setAlarm(expires);
    return { expires };
  }

  async alarm() {
    await Promise.all([
      this.ctx.storage.deleteAlarm(),
      this.ctx.storage.deleteAll(),
      this.store.delete("#data"),
      this.store.delete("#createdAt"),
    ]);
  }

  async finish() {
    let state: unknown;
    try {
      state = await this.store.get("#data");
    } catch {
      return "challenge_not_found" as const;
    }

    const createdAt = await this.store.get("#createdAt").catch(() => undefined);
    const expired =
      createdAt === undefined ||
      Date.now() - new Date(createdAt).getTime() > CHALLENGE_TTL_MS;

    await Promise.all([
      this.ctx.storage.deleteAll(),
      this.ctx.storage.deleteAlarm(),
      this.store.delete("#data"),
      this.store.delete("#createdAt"),
    ]);

    if (expired) {
      return "challenge_expired" as const;
    }

    return { state };
  }
}
