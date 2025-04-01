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

export const cookie = {
  serialize(
    name: string,
    value: string,
    options: CookieSerializeOptions = {},
  ): string {
    const pairs = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

    // Add options to cookie string
    if (options.maxAge) pairs.push(`Max-Age=${options.maxAge}`);
    if (options.domain) pairs.push(`Domain=${options.domain}`);
    if (options.path) pairs.push(`Path=${options.path}`);
    if (options.expires) pairs.push(`Expires=${options.expires.toUTCString()}`);
    if (options.httpOnly) pairs.push("HttpOnly");
    if (options.secure) pairs.push("Secure");
    if (options.sameSite) pairs.push(`SameSite=${options.sameSite}`);

    return pairs.join("; ");
  },

  parse(str: string, key: string): string | null {
    if (!str) return null;

    // Find only the specified key's value
    const match = str
      .split(";")
      .find((pair) => pair.trim().startsWith(`${encodeURIComponent(key)}=`));

    if (!match) return null;

    const value = match.split("=")[1]?.trim();
    if (!value) return null;
    return value;
  },
};

export const createCookie = <T,>(
  name: string,
  secret: string,
  options: CookieSerializeOptions = {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
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

      if (signature !== encode(await hmac(secret, encodedValue))) {
        return null;
      }

      return JSON.parse(decode(encodedValue)) as T;
    },
  };
};

const encode = (value: string) => btoa(value);
const decode = (value: string) => atob(value);

const encoder = new TextEncoder();

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

export function invariant<T>(condition: T, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export const extractVisitorHeaders = (headers: Headers): VisitedHeaders => {
  const result: VisitedHeaders = {};

  const keys: (keyof VisitedHeaders)[] = [
    "city",
    "country",
    "continent",
    "longitude",
    "latitude",
    "region",
    "regionCode",
    "metroCode",
    "postalCode",
    "timezone",
  ];

  for (const key of keys) {
    result[key] = headers.get(key)?.toString() ?? undefined;
  }

  return result;
};

export type VisitedHeaders = {
  city?: string | undefined;
  country?: string | undefined;
  continent?: string | undefined;
  longitude?: string | undefined;
  latitude?: string | undefined;
  region?: string | undefined;
  regionCode?: string | undefined;
  metroCode?: string | undefined;
  postalCode?: string | undefined;
  timezone?: string | undefined;
};

type User = {
  userId: string;
  passkeyId: string;
  expires: string;
};

export const createUserCookie = createCookie<User>;

export const authenticate = async (request: Request, secret: string) => {
  const cookie = request.headers.get("Cookie") ?? "";
  const userCookie = createUserCookie("user", secret);
  const user = await userCookie.parse(cookie);

  if (!user) {
    throw Response.redirect(new URL("/auth/register", request.url));
  }

  if (new Date(user.expires) < new Date()) {
    throw Response.redirect(new URL("/auth/verify", request.url));
  }

  return user;
};
