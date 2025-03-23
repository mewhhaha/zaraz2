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
    const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

    if (options.maxAge) {
      parts.push(`Max-Age=${options.maxAge}`);
    }

    if (options.domain) {
      parts.push(`Domain=${options.domain}`);
    }

    if (options.path) {
      parts.push(`Path=${options.path}`);
    }

    if (options.expires) {
      parts.push(`Expires=${options.expires.toUTCString()}`);
    }

    if (options.httpOnly) {
      parts.push("HttpOnly");
    }

    if (options.secure) {
      parts.push("Secure");
    }

    if (options.sameSite) {
      parts.push(`SameSite=${options.sameSite}`);
    }

    return parts.join("; ");
  },

  parse(str: string): Record<string, string> {
    const result: Record<string, string> = {};

    if (!str) {
      return result;
    }

    str.split(";").forEach((pair) => {
      const parts = pair.split("=");
      const key = parts[0]?.trim();

      if (!key) return;

      const value = parts[1]?.trim() || "";
      result[decodeURIComponent(key)] = decodeURIComponent(value);
    });

    return result;
  },
};

export const createCookie = (name: string, secret: string) => {
  return {
    serialize: async (value: unknown) => {
      const encodedValue = encode(JSON.stringify(value));
      const signature = encode(await hmac(secret, encodedValue));
      const signed = `${encodedValue}.${signature}`;
      return cookie.serialize(name, signed, {
        httpOnly: true,
        secure: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    },
    parse: async <T,>(value: string) => {
      const { [name]: parsed } = cookie.parse(value);
      if (!parsed) {
        return null;
      }
      const [encodedValue, signature] = parsed.split(".");
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
