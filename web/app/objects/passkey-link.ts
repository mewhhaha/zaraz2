// Runtime-free module: imported by request handlers and tests, so it must
// not pull in `cloudflare:workers` the way the Durable Object modules do.

export type PasskeyLink = {
  name: string;
  credentialId: string;
  username: string;
  passkeyId: string;
  createdAt: Date;
  lastUsedAt: Date;
};

export const makePasskeyLink = ({
  passkeyId,
  credentialId,
  username,
}: {
  passkeyId: DurableObjectId | string;
  credentialId: string;
  username: string;
}): PasskeyLink => {
  const passkeyIdString = passkeyId.toString();
  const date = new Date();
  return {
    passkeyId: passkeyIdString,
    credentialId,
    username,
    createdAt: date,
    lastUsedAt: date,
    name: `passkey-${passkeyIdString.slice(0, 3) + passkeyIdString.slice(-3)}`,
  };
};
