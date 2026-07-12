import {
  decodeJsonPayload,
  encodeJsonPayload,
} from "../../helpers/json-payload";
import type { VisitedHeaders } from "../../helpers/visited";
import type { Account, DurableObjectUser } from "../../objects/user";
import { makePasskeyLink } from "../../objects/passkey-link";
import type { DurableObjectChallenge } from "../../objects/challenge";
import type { DurableObjectPasskey } from "../../objects/passkey";
import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types.js";

export { extractVisitedHeaders as extractVisitorHeaders } from "../../helpers/visited";
export type { VisitedHeaders };

// Cookie implementation
interface CookieSerializeOptions {
  maxAge?: number;
  domain?: string;
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

const encoder = new TextEncoder();

export const createCookie = <T, N extends string>(
  name: N,
  secret: string,
  options: CookieSerializeOptions = {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 400,
  },
) => {
  return {
    serialize: async (value: T) => {
      const encodedValue = encodeJsonPayload(value);
      const signature = btoa(await hmac(secret, encodedValue));
      const signed = `${encodedValue}.${signature}`;
      const pairs = [
        `${encodeURIComponent(name)}=${encodeURIComponent(signed)}`,
      ];

      // Add options to cookie string
      if (options.maxAge) pairs.push(`Max-Age=${options.maxAge}`);
      if (options.domain) pairs.push(`Domain=${options.domain}`);
      if (options.path) pairs.push(`Path=${options.path}`);
      if (options.expires)
        pairs.push(`Expires=${options.expires.toUTCString()}`);
      if (options.httpOnly) pairs.push("HttpOnly");
      if (options.secure) pairs.push("Secure");
      if (options.sameSite) pairs.push(`SameSite=${options.sameSite}`);

      return pairs.join("; ");
    },
    destroy: () => {
      const pairs = [`${encodeURIComponent(name)}=""`];

      pairs.push(`Max-Age=0`);
      if (options.domain) pairs.push(`Domain=${options.domain}`);
      if (options.path) pairs.push(`Path=${options.path}`);
      if (options.expires)
        pairs.push(`Expires=${options.expires.toUTCString()}`);
      if (options.httpOnly) pairs.push("HttpOnly");
      if (options.secure) pairs.push("Secure");
      if (options.sameSite) pairs.push(`SameSite=${options.sameSite}`);

      return pairs.join("; ");
    },
    parse: async (cookieHeader: string): Promise<T | null> => {
      if (!cookieHeader) return null;

      // Find only the specified key's value
      const match = cookieHeader
        .split(";")
        .find((pair) => pair.trim().startsWith(`${encodeURIComponent(name)}=`));

      if (!match) return null;

      const value = match.split("=")[1]?.trim();
      if (!value) return null;

      const [encodedValue, signature] = decodeURIComponent(value).split(".");
      if (!encodedValue || !signature) {
        return null;
      }

      const expectedSignature = btoa(await hmac(secret, encodedValue));
      if (
        !timingSafeEqual(
          encoder.encode(signature),
          encoder.encode(expectedSignature),
        )
      ) {
        return null;
      }

      try {
        return decodeJsonPayload<T>(encodedValue);
      } catch {
        return null;
      }
    },
  };
};

export const hmac = async (
  secretKey: string,
  message: string,
  { hash = "SHA-256" }: { hash?: string } = {},
): Promise<string> => {
  const secretKeyData = encoder.encode(secretKey);
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyData,
    { name: "HMAC", hash: { name: hash } },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );

  return [...new Uint8Array(signature)]
    .map((b) => String.fromCharCode(b))
    .join("");
};

export type Auth = {
  username: string;
  passkeyId: string;
  credentialId: string;
  expires: string;
  /** When the session was first established; refreshes keep this fixed. */
  issuedAt?: string;
};

export class AuthExpiredError extends Error {
  auth: Auth;

  constructor(auth: Auth) {
    super("auth_expired");
    this.auth = auth;
  }
}

export const createAuthCookie = createCookie<Auth, "auth">;

export const authenticate = async (request: Request, secret: string) => {
  const cookie = request.headers.get("Cookie") ?? "";
  const authCookie = createAuthCookie("auth", secret);
  const auth = await authCookie.parse(cookie);

  if (!auth) {
    throw new Error("auth_not_found");
  }

  if (new Date(auth.expires) < new Date()) {
    throw new AuthExpiredError(auth);
  }

  return auth;
};

export const ensurePasskeyLinked = async (
  users: DurableObjectNamespace<DurableObjectUser>,
  auth: Auth,
): Promise<Account> => {
  const account = await users
    .get(users.idFromName(auth.username))
    .account()
    .data();

  const linked = account.passkeys.some(
    (passkey) =>
      passkey.passkeyId === auth.passkeyId &&
      passkey.credentialId === auth.credentialId,
  );

  if (!linked) {
    throw new Error("passkey_revoked");
  }

  return account;
};

const requireAuthCache = new WeakMap<
  Request,
  Promise<{ auth: Auth; account: Account }>
>();

export const requireAuth = (
  request: Request,
  secret: string,
  users: DurableObjectNamespace<DurableObjectUser>,
): Promise<{ auth: Auth; account: Account }> => {
  let pending = requireAuthCache.get(request);
  if (!pending) {
    pending = (async () => {
      const auth = await authenticate(request, secret);
      const account = await ensurePasskeyLinked(users, auth);
      return { auth, account };
    })();
    requireAuthCache.set(request, pending);
  }
  return pending;
};

/** Sliding window: each refresh pushes expiry this far out. */
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
/** Absolute ceiling: refreshes stop working this long after sign-in. */
export const MAX_SESSION_AGE_MS = 1000 * 60 * 60 * 24 * 90;

export const expires = () => {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
};

export const issuedAt = () => new Date().toISOString();

/**
 * Credential IDs arrive unauthenticated and are used with `idFromName`, so
 * bound them to plausible base64url before instantiating a Durable Object.
 */
export const isCredentialId = (value: string): boolean =>
  /^[a-zA-Z0-9_-]{16,1024}$/.test(value);

type RegisterPasskeyArgs = {
  token: string;
  username: string;
  secret: string;
  visited: VisitedHeaders;
  challenges: DurableObjectNamespace<DurableObjectChallenge>;
  passkeys: DurableObjectNamespace<DurableObjectPasskey>;
};

/**
 * Shared verification path for both account registration and adding a
 * passkey: parse the signed token, consume the challenge, verify the
 * credential, and persist it. Throws a `Response` on any failure.
 */
export const registerPasskeyWithToken = async ({
  token,
  username,
  secret,
  visited,
  challenges,
  passkeys,
}: RegisterPasskeyArgs) => {
  const { json, challengeId } = await parseToken<RegistrationJSON>(
    token,
    secret,
  );

  const challenge = await challenges
    .get(challenges.idFromString(challengeId))
    .finish();
  if (typeof challenge === "string") {
    throw new Response(challenge, { status: 400 });
  }

  const credentialId = json.id;
  if (!isCredentialId(credentialId)) {
    throw new Response("credential_invalid", { status: 400 });
  }

  const passkey = passkeys.get(passkeys.idFromName(credentialId));
  const data = await passkey.register({
    username,
    json,
    challengeId,
    visited,
  });
  if (typeof data === "string") {
    throw new Response(data, { status: 400 });
  }

  const passkeyLink = makePasskeyLink({
    passkeyId: passkey.id,
    credentialId,
    username,
  });

  return { passkey, passkeyLink, credentialId };
};

export const parseToken = async <T>(
  token: string,
  secret: string,
): Promise<{ json: T; challengeId: string }> => {
  const [challengeId, signatureB64, registrationBase64Json] = token.split(".");
  if (
    challengeId === undefined ||
    signatureB64 === undefined ||
    registrationBase64Json === undefined
  ) {
    throw new Response("token_invalid", { status: 400 });
  }

  const a = btoa(await hmac(secret, challengeId));
  const b = signatureB64;

  if (!timingSafeEqual(encoder.encode(a), encoder.encode(b))) {
    throw new Response("signature_invalid", { status: 400 });
  }

  let json: T;
  try {
    json = decodeJsonPayload<T>(registrationBase64Json);
  } catch {
    throw new Response("token_invalid", { status: 400 });
  }

  return { json, challengeId };
};
const timingSafeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index];
  }
  return diff === 0;
};
