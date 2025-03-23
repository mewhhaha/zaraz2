import { client } from "@passwordless-id/webauthn";

let controller: AbortController;

export const authenticate = async (challengeUri: string): Promise<string> => {
  controller?.abort();
  controller = new AbortController();

  const response = await fetch(challengeUri, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const token = await response.text();

  const [challenge] = token.split(".");

  const authentication = await client.authenticate({
    challenge,
    userVerification: "required",
  });

  const signinToken = `${token}.${btoa(JSON.stringify(authentication))}`;

  return signinToken;
};

export const register = async (
  challengeUri: string,
  username: string,
): Promise<string> => {
  controller?.abort();
  controller = new AbortController();

  const response = await fetch(challengeUri, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const token = await response.text();

  const [challenge] = token.split(".");

  const registration = await client.register({
    user: username,
    challenge,
    userVerification: "required",
    discoverable: "required",
    timeout: 60000,
    attestation: true,
  });

  const registrationToken = `${token}.${btoa(JSON.stringify(registration))}`;

  return registrationToken;
};
