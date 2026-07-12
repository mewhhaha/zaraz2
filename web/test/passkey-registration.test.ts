import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";

const { authenticateCredential, registerCredential } = vi.hoisted(() => ({
  authenticateCredential: vi.fn(),
  registerCredential: vi.fn(),
}));

vi.mock("@passwordless-id/webauthn", () => ({
  client: {
    authenticate: authenticateCredential,
    register: registerCredential,
  },
}));

import { authenticate, register } from "../app/helpers/passkey";
import { encodeJsonPayload } from "../app/helpers/json-payload";
import {
  createAuthCookie,
  hmac,
  parseToken,
} from "../app/routes/auth.$/helpers";

const unicodeHandle = "żółw";
const secret = "test-secret";

const createSignedToken = async (payload: string) => {
  const challengeId = "challenge-id";
  const signature = btoa(await hmac(secret, challengeId));
  return `${challengeId}.${signature}.${payload}`;
};

const expectTokenInvalid = async (payload: string) => {
  try {
    await parseToken(await createSignedToken(payload), secret);
    expect.fail("Expected the registration token to be rejected.");
  } catch (error) {
    if (!(error instanceof Response)) throw error;

    expect(error.status).toBe(400);
    expect(await error.text()).toBe("token_invalid");
  }
};

afterEach(() => {
  authenticateCredential.mockReset();
  registerCredential.mockReset();
  vi.unstubAllGlobals();
});

describe("passkey registration tokens", () => {
  it("round-trips a registration containing a Unicode handle", async () => {
    const registration = {
      authenticatorAttachment: "platform",
      clientExtensionResults: {},
      id: "credential-id",
      rawId: "credential-id",
      response: {
        attestationObject: "attestation-object",
        authenticatorData: "authenticator-data",
        clientDataJSON: "client-data",
        publicKey: "public-key",
        publicKeyAlgorithm: -7,
        transports: ["internal"],
      },
      type: "public-key",
      user: {
        displayName: unicodeHandle,
        id: "user-id",
        name: unicodeHandle,
      },
    } satisfies RegistrationJSON;
    const challengeId = "challenge-id";
    const signature = btoa(await hmac(secret, challengeId));

    registerCredential.mockResolvedValue(registration);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(`${challengeId}.${signature}`)),
    );

    const token = await register("/auth/challenge", unicodeHandle);

    await expect(parseToken<RegistrationJSON>(token, secret)).resolves.toEqual({
      challengeId,
      json: registration,
    });
  });

  it("round-trips an authentication response", async () => {
    const authentication = {
      id: "credential-id",
      response: {
        authenticatorData: "authenticator-data",
        clientDataJSON: "client-data",
        signature: "signature",
      },
      type: "public-key",
    };
    const challengeId = "challenge-id";
    const signature = btoa(await hmac(secret, challengeId));

    authenticateCredential.mockResolvedValue(authentication);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(`${challengeId}.${signature}`)),
    );

    const token = await authenticate("/auth/challenge");

    await expect(parseToken(token, secret)).resolves.toEqual({
      challengeId,
      json: authentication,
    });
  });

  it("round-trips an auth cookie containing a Unicode handle", async () => {
    const auth = { username: unicodeHandle };
    const cookie = createAuthCookie<typeof auth, "auth">("auth", secret);

    const serialized = await cookie.serialize(auth);

    await expect(cookie.parse(serialized)).resolves.toEqual(auth);
  });

  it.each(["café", "Ã©"])(
    "preserves the legacy Latin-1 cookie handle %s",
    async (username) => {
      const auth = { username };
      const encodedValue = btoa(JSON.stringify(auth));
      const signature = btoa(await hmac(secret, encodedValue));
      const serialized = `auth=${encodeURIComponent(`${encodedValue}.${signature}`)}`;
      const cookie = createAuthCookie<typeof auth, "auth">("auth", secret);

      await expect(cookie.parse(serialized)).resolves.toEqual(auth);
    },
  );

  it("rejects invalid base64 registration payloads", async () => {
    await expectTokenInvalid("%%%invalid-base64%%%");
  });

  it("rejects invalid UTF-8 registration payloads", async () => {
    const encodedValue = encodeJsonPayload({ username: unicodeHandle });
    const binary = atob(encodedValue);
    const invalidUtf8 = btoa(
      `${binary.slice(0, -1)}${String.fromCharCode(0xff)}`,
    );

    await expectTokenInvalid(invalidUtf8);
  });

  it("rejects invalid JSON registration payloads", async () => {
    await expectTokenInvalid(btoa("not-json"));
  });
});
