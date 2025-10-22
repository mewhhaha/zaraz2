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
    if (await this.store.has("#data")) {
      return "challenge_exists" as const;
    }

    this.store.set("#data", state);
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 10);
    this.ctx.storage.setAlarm(expires);
    return { expires };
  }

  async alarm() {
    void this.ctx.storage.deleteAlarm();
    void this.ctx.storage.deleteAll();

    this.store.delete("#data");
  }

  async finish() {
    try {
      const state = await this.store.get("#data");
      void this.ctx.storage.deleteAll();
      void this.ctx.storage.deleteAlarm();
      this.store.delete("#data");

      return { state };
    } catch {
      return "challenge_not_found" as const;
    }
  }
}
