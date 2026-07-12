import { describe, expect, it } from "vitest";
import * as server from "@passwordless-id/webauthn/dist/esm/server.js";
import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";

/**
 * Exercises the real verification path used by DurableObjectPasskey.register
 * with a browser-shaped payload — verifyRegistration checks parsed fields
 * (rpIdHash, flags, type, origin, challenge) but not attestation signatures,
 * so a hand-crafted response covers the same failure modes as a real browser.
 */

const encoder = new TextEncoder();

const toBase64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_");

const ORIGIN = "http://localhost:8787";
// Same shape as a DurableObjectId string.
const CHALLENGE_ID = "ab".repeat(32);
const CREDENTIAL_ID = "test-credential-id-1234567890";

const makeClientDataJSON = (overrides?: {
  origin?: string;
  challenge?: string;
  type?: string;
}) =>
  toBase64url(
    encoder.encode(
      JSON.stringify({
        type: overrides?.type ?? "webauthn.create",
        challenge: overrides?.challenge ?? CHALLENGE_ID,
        origin: overrides?.origin ?? ORIGIN,
        crossOrigin: false,
      }),
    ),
  );

const makeAuthenticatorData = async ({
  rpId = "localhost",
  flags = 0b0100_0101, // userPresent | userVerified | attestedData
}: { rpId?: string; flags?: number } = {}) => {
  const rpIdHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(rpId)),
  );
  const data = new Uint8Array(53);
  data.set(rpIdHash, 0);
  data[32] = flags;
  // bytes 33-36: signCount 0, bytes 37-52: zeroed AAGUID
  return toBase64url(data);
};

const makeRegistration = async (overrides?: {
  clientDataJSON?: string;
  authenticatorData?: string;
}): Promise<RegistrationJSON> =>
  ({
    type: "public-key",
    id: CREDENTIAL_ID,
    rawId: CREDENTIAL_ID,
    authenticatorAttachment: "platform",
    clientExtensionResults: {},
    response: {
      attestationObject: "",
      authenticatorData:
        overrides?.authenticatorData ?? (await makeAuthenticatorData()),
      clientDataJSON: overrides?.clientDataJSON ?? makeClientDataJSON(),
      publicKey: "AAAA",
      publicKeyAlgorithm: -7,
      transports: ["internal"],
    },
    user: {
      id: "user-id",
      name: "tester",
      displayName: "tester",
    },
  }) as RegistrationJSON;

describe("webauthn registration verification", () => {
  it("accepts a registration for the configured localhost origin", async () => {
    const registration = await makeRegistration();

    const { credential, userVerified } = await server.verifyRegistration(
      registration,
      { origin: ORIGIN, challenge: CHALLENGE_ID },
    );

    expect(credential.id).toBe(CREDENTIAL_ID);
    expect(userVerified).toBe(true);
  });

  it("rejects a mismatched origin (e.g. 127.0.0.1 vs localhost)", async () => {
    const registration = await makeRegistration({
      clientDataJSON: makeClientDataJSON({ origin: "http://127.0.0.1:8787" }),
      authenticatorData: await makeAuthenticatorData({ rpId: "127.0.0.1" }),
    });

    await expect(
      server.verifyRegistration(registration, {
        origin: ORIGIN,
        challenge: CHALLENGE_ID,
      }),
    ).rejects.toThrow(/origin/i);
  });

  it("rejects a mismatched challenge", async () => {
    const registration = await makeRegistration({
      clientDataJSON: makeClientDataJSON({ challenge: "cd".repeat(32) }),
    });

    await expect(
      server.verifyRegistration(registration, {
        origin: ORIGIN,
        challenge: CHALLENGE_ID,
      }),
    ).rejects.toThrow(/challenge/i);
  });

  it("rejects an authentication-type client payload", async () => {
    const registration = await makeRegistration({
      clientDataJSON: makeClientDataJSON({ type: "webauthn.get" }),
    });

    await expect(
      server.verifyRegistration(registration, {
        origin: ORIGIN,
        challenge: CHALLENGE_ID,
      }),
    ).rejects.toThrow(/type/i);
  });
});
