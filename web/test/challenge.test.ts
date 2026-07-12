import { describe, expect, it } from "vitest";
import type { EnvAuth } from "../app/routes/auth.$/env";
import createChallenge from "../app/routes/auth.$/paths/challenge";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

describe("passkey challenge", () => {
  it("persists the challenge before returning its token", async () => {
    const saveStarted = deferred();
    const saveFinished = deferred();
    const id = { toString: () => "challenge-id" };
    const env = {
      SECRET: "test-secret",
      CHALLENGE: {
        newUniqueId: () => id,
        get: () => ({
          id,
          save: async () => {
            saveStarted.resolve();
            await saveFinished.promise;
          },
        }),
      },
    } as unknown as EnvAuth;

    let responseSettled = false;
    const responsePromise = createChallenge({ env }).then((response) => {
      responseSettled = true;
      return response;
    });

    await saveStarted.promise;
    await Promise.resolve();
    expect(responseSettled).toBe(false);

    saveFinished.resolve();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(await response.text()).toMatch(/^challenge-id\./);
  });
});
