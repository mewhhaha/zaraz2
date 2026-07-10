import type { Account, DurableObjectUser } from "../../objects/user";

export {
  extractVisitedHeaders as extractVisitorHeaders,
  type VisitedHeaders,
} from "../../helpers/visited";

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
      const encodedValue = encode(JSON.stringify(value));
      const signature = encode(await hmac(secret, encodedValue));
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

      const expectedSignature = encode(await hmac(secret, encodedValue));
      if (
        !timingSafeEqual(
          encoder.encode(signature),
          encoder.encode(expectedSignature),
        )
      ) {
        return null;
      }

      return JSON.parse(decode(encodedValue)) as T;
    },
  };
};

const encode = (value: string) => btoa(value);
const decode = (value: string) => atob(value);

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

export const requireAuth = async (
  request: Request,
  secret: string,
  users: DurableObjectNamespace<DurableObjectUser>,
) => {
  const auth = await authenticate(request, secret);
  const account = await ensurePasskeyLinked(users, auth);
  return { auth, account };
};

export const expires = () => {
  return new Date(Date.now() + 1000 * 60 * 60 * 60 * 10).toISOString();
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

  const registrationRaw = atob(registrationBase64Json);

  const json = JSON.parse(registrationRaw) as T;

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
