const UTF8_PAYLOAD_PREFIX = "\0utf8:";
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export const encodeJsonPayload = (value: unknown) => {
  const json = JSON.stringify(value);
  if (json === undefined) {
    throw new TypeError(`Cannot encode a ${typeof value} JSON payload.`);
  }

  const bytes = encoder.encode(json);
  let binary = UTF8_PAYLOAD_PREFIX;

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

export const decodeJsonPayload = <T>(value: string): T => {
  const binary = atob(value);
  if (!binary.startsWith(UTF8_PAYLOAD_PREFIX)) {
    return JSON.parse(binary) as T;
  }

  const offset = UTF8_PAYLOAD_PREFIX.length;
  const bytes = new Uint8Array(binary.length - offset);

  for (let index = offset; index < binary.length; index += 1) {
    bytes[index - offset] = binary.charCodeAt(index);
  }

  return JSON.parse(decoder.decode(bytes)) as T;
};
