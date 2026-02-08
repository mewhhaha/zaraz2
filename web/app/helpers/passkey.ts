import { client } from "@passwordless-id/webauthn";

type PasskeyRequestOptions = {
  signal?: AbortSignal;
};

let activeController: AbortController | undefined;
const finalizeController = (controller: AbortController) => {
  if (activeController === controller) {
    activeController = undefined;
  }
};

const createSignal = (external?: AbortSignal) => {
  activeController?.abort();

  const controller = new AbortController();
  activeController = controller;

  const signal =
    external !== undefined
      ? AbortSignal.any([controller.signal, external])
      : controller.signal;

  if (signal.aborted) {
    controller.abort();
  }

  return { controller, signal };
};

export const authenticate = async (
  challengeUri: string,
  allowCredentials?: string[],
  options?: PasskeyRequestOptions,
): Promise<string> => {
  const { controller, signal } = createSignal(options?.signal);

  try {
    signal.throwIfAborted();

    const response = await fetch(challengeUri, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    signal.throwIfAborted();

    const token = await response.text();
    signal.throwIfAborted();

    const [challenge] = token.split(".");

    const authentication = await client.authenticate({
      challenge,
      userVerification: "required",
      ...(allowCredentials ? { allowCredentials } : {}),
    });

    signal.throwIfAborted();

    const signinToken = `${token}.${btoa(JSON.stringify(authentication))}`;

    return signinToken;
  } finally {
    finalizeController(controller);
  }
};

export const register = async (
  challengeUri: string,
  username: string,
  options?: PasskeyRequestOptions,
): Promise<string> => {
  const { controller, signal } = createSignal(options?.signal);

  try {
    signal.throwIfAborted();

    const response = await fetch(challengeUri, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    signal.throwIfAborted();

    const token = await response.text();
    signal.throwIfAborted();

    const [challenge] = token.split(".");

    const registration = await client.register({
      user: username,
      challenge,
      userVerification: "required",
      discoverable: "required",
      timeout: 60000,
      attestation: false,
    });

    signal.throwIfAborted();

    const registrationToken = `${token}.${btoa(JSON.stringify(registration))}`;

    return registrationToken;
  } finally {
    finalizeController(controller);
  }
};

export type { PasskeyRequestOptions };
