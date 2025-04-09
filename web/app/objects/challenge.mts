import { DurableObject } from "cloudflare:workers";
import type { Env } from "@mewhhaha/fx-router";
import { store } from "../helpers/store";

export type Finish<T> = { state: T } | "challenge_not_found";

export class DurableObjectChallenge extends DurableObject<Env> {
  @store
  accessor #data: Promise<unknown>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    const read = async <T,>(key: string): Promise<T> => {
      const v = await state.storage.get<T>(key);
      if (v === undefined) {
        return Promise.reject("Missing " + key);
      }
      return v;
    };

    this.#data = read("#state");
  }

  async save(state: unknown) {
    try {
      await this.#data;
      return "challenge_exists" as const;
    } catch (e) {
      this.#data = Promise.resolve(state);
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 10);
      this.ctx.storage.setAlarm(expires);
      return { expires };
    }
  }

  alarm() {
    void this.ctx.storage.deleteAlarm();
    void this.ctx.storage.deleteAll();

    this.#data = Promise.reject("Challenge expired");
  }

  async finish() {
    try {
      const state = await this.#data;
      void this.ctx.storage.deleteAll();
      void this.ctx.storage.deleteAlarm();

      return { state };
    } catch (e) {
      return "challenge_not_found" as const;
    }
  }
}
