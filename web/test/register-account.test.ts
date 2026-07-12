import { describe, expect, it, vi } from "vitest";
import register from "../app/routes/auth.$/paths/register";
import exists from "../app/routes/auth.$/paths/exists";
import refresh from "../app/routes/auth.$/paths/refresh";
import {
  createAuthCookie,
  hmac,
  issuedAt,
  type Auth,
} from "../app/routes/auth.$/helpers";
import { encodeJsonPayload } from "../app/helpers/json-payload";
import type { EnvAuth } from "../app/routes/auth.$/env";

const secret = "test-secret";
const challengeId = "ab".repeat(32);
const credentialId = "test-credential-id-1234567890";

const makeToken = async (registration: unknown) => {
  const signature = btoa(await hmac(secret, challengeId));
  return `${challengeId}.${signature}.${encodeJsonPayload(registration)}`;
};

const makeRegistration = (id: string = credentialId) => ({
  type: "public-key",
  id,
  rawId: id,
  clientExtensionResults: {},
  response: {},
  user: { id: "user-id", name: "tester", displayName: "tester" },
});

const makeStubs = () => {
  const passkey = {
    id: { toString: () => "passkey-id" },
    register: vi.fn(async () => ({ metadata: {} })),
    destruct: vi.fn(async () => ({ metadata: {} })),
  };
  const user = {
    exists: vi.fn(async () => false),
    create: vi.fn(async (account: unknown) => account),
  };
  const env = {
    SECRET: secret,
    CHALLENGE: {
      idFromString: (id: string) => id,
      get: () => ({ finish: async () => ({ state: {} }) }),
    },
    PASSKEY: {
      idFromName: (name: string) => name,
      get: () => passkey,
    },
    USER: {
      idFromName: (name: string) => name,
      get: () => user,
    },
  } as unknown as EnvAuth;

  return { env, passkey, user };
};

const makeRequest = async (registration: unknown, username = "tester") => {
  const body = new FormData();
  body.set("token", await makeToken(registration));
  body.set("username", username);
  return new Request("http://localhost:8787/auth/register", {
    method: "POST",
    body,
  });
};

const expectResponseError = async (
  promise: Promise<unknown>,
  status: number,
  text: string,
) => {
  try {
    await promise;
    expect.fail(`Expected a thrown ${status} Response.`);
  } catch (error) {
    if (!(error instanceof Response)) throw error;
    expect(error.status).toBe(status);
    expect(await error.text()).toBe(text);
  }
};

describe("account registration", () => {
  it("creates the user and sets the auth cookie", async () => {
    const { env, user } = makeStubs();

    const response = await register({
      request: await makeRequest(makeRegistration()),
      env,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toContain("auth=");
    expect(user.create).toHaveBeenCalledOnce();
  });

  it("rejects a taken username before touching the passkey", async () => {
    const { env, user, passkey } = makeStubs();
    user.exists.mockResolvedValue(true);

    await expectResponseError(
      register({ request: await makeRequest(makeRegistration()), env }),
      409,
      "user_exists",
    );
    expect(passkey.register).not.toHaveBeenCalled();
  });

  it("destroys the stored passkey when losing the username race", async () => {
    const { env, user, passkey } = makeStubs();
    user.create.mockResolvedValue("user_exists");

    await expectResponseError(
      register({ request: await makeRequest(makeRegistration()), env }),
      409,
      "user_exists",
    );
    expect(passkey.register).toHaveBeenCalledOnce();
    expect(passkey.destruct).toHaveBeenCalledWith("tester");
  });

  it("rejects implausible credential ids before instantiating objects", async () => {
    const { env, passkey } = makeStubs();

    await expectResponseError(
      register({ request: await makeRequest(makeRegistration("x!")), env }),
      400,
      "credential_invalid",
    );
    expect(passkey.register).not.toHaveBeenCalled();
  });
});

describe("username availability", () => {
  const makeExistsRequest = (username?: string) => {
    const body = new FormData();
    if (username !== undefined) body.set("username", username);
    return new Request("http://localhost:8787/auth/exists", {
      method: "POST",
      body,
    });
  };

  it("reports a free handle as available", async () => {
    const { env } = makeStubs();

    const response = await exists({ request: makeExistsRequest("free"), env });

    expect(response.status).toBe(200);
  });

  it("rejects a taken handle", async () => {
    const { env, user } = makeStubs();
    user.exists.mockResolvedValue(true);

    await expectResponseError(
      exists({ request: makeExistsRequest("taken"), env }),
      409,
      "user_exists",
    );
  });
});

describe("session refresh ceiling", () => {
  const makeCookieRequest = async (auth: Auth) => {
    const cookie = createAuthCookie("auth", secret);
    return new Request("http://localhost:8787/auth/refresh", {
      method: "POST",
      headers: { Cookie: await cookie.serialize(auth) },
    });
  };

  const baseAuth: Auth = {
    username: "tester",
    passkeyId: "passkey-id",
    credentialId,
    expires: new Date(Date.now() + 1000 * 60).toISOString(),
  };

  it("refuses to refresh a session past the absolute ceiling", async () => {
    const { env } = makeStubs();
    const request = await makeCookieRequest({
      ...baseAuth,
      issuedAt: new Date(
        Date.now() - 1000 * 60 * 60 * 24 * 91,
      ).toISOString(),
    });

    const response = await refresh({ request, env });

    expect(response.status).toBe(401);
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("extends a session within the ceiling", async () => {
    const account = {
      username: "tester",
      passkeys: [{ passkeyId: "passkey-id", credentialId }],
    };
    const env = {
      ...makeStubs().env,
      USER: {
        idFromName: (name: string) => name,
        get: () => ({
          account: () => ({ data: async () => account }),
        }),
      },
    } as unknown as EnvAuth;
    const request = await makeCookieRequest({
      ...baseAuth,
      issuedAt: issuedAt(),
    });

    const response = await refresh({ request, env });

    expect(response.status).toBe(200);
    const { expires } = (await response.json()) as { expires: string };
    expect(new Date(expires).getTime()).toBeGreaterThan(Date.now());
  });
});
