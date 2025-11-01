import { DurableObject } from "cloudflare:workers";
import type { Env } from "@mewhhaha/ruwuter";
import { createStore, DurableStore } from "../helpers/store";

export type Finish<T> = { state: T } | "challenge_not_found";

type ChallengeStore = { "#data": unknown };

export class DurableObjectChallenge extends DurableObject<Env> {
  private readonly store: DurableStore<ChallengeStore>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.store = createStore(state.storage, {
      "#data": () => state.storage.get<unknown>("#data"),
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
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 10);
    await this.ctx.storage.setAlarm(expires);
    return { expires };
  }

  async alarm() {
    await Promise.all([
      this.ctx.storage.deleteAlarm(),
      this.ctx.storage.deleteAll(),
      this.store.delete("#data"),
    ]);
  }

  async finish() {
    try {
      const state = await this.store.get("#data");
      await Promise.all([
        this.ctx.storage.deleteAll(),
        this.ctx.storage.deleteAlarm(),
        this.store.delete("#data"),
      ]);

      return { state };
    } catch {
      return "challenge_not_found" as const;
    }
  }
}
