import { server } from "@passwordless-id/webauthn";
import { DurableObject } from "cloudflare:workers";
import type {
  AuthenticationInfo,
  AuthenticationJSON,
  AuthenticatorInfo,
  CredentialInfo,
  RegistrationJSON,
} from "@passwordless-id/webauthn/dist/esm/types.js";
import type { Env } from "@mewhhaha/fx-router";
import { store } from "../helpers/store";

const VISITOR_HISTORY_LENGTH = 10;

type Registration = {
  userId: string;
  json: unknown;
  challengeId: string;
  visited: VisitedHeaders;
};

type TryAuthenticate = {
  challengeId: string;
  json: unknown;
  visited: VisitedHeaders;
};

export type Metadata = {
  passkeyId: string;
  credentialId: string;
  userId: string;
  createdAt: string;
};

export type Passkey = {
  credential: Credential;
  metadata: Metadata;
};

export class DurableObjectPasskey extends DurableObject<Env> {
  @store
  accessor #metadata: Promise<Metadata> = Promise.reject();

  @store
  accessor #credential: Promise<CredentialInfo> = Promise.reject();

  @store
  accessor #visitors: Promise<Visitor[]> = Promise.reject();

  @store
  accessor #authenticator: Promise<AuthenticatorInfo> = Promise.reject();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    const read = async <T,>(initial: Promise<T>, key: string) => {
      const v = await state.storage.get<T>(key);
      if (!v) {
        return initial;
      }
      return v;
    };

    this.#metadata = read<Metadata>(this.#metadata, "metadata");
    this.#credential = read<CredentialInfo>(this.#credential, "credential");
    this.#visitors = read<Visitor[]>(this.#visitors, "visitors");
    this.#authenticator = read<AuthenticatorInfo>(
      this.#authenticator,
      "authenticator",
    );
  }

  async register({ json, visited, userId, challengeId }: Registration) {
    try {
      await this.#metadata;
      return "passkey_exists" as const;
    } catch {}

    try {
      const { authenticator, credential } = await server.verifyRegistration(
        json as RegistrationJSON,
        {
          origin: this.env.ORIGIN,
          challenge: challengeId,
        },
      );
      const metadata: Metadata = {
        userId,
        passkeyId: this.ctx.id.toString(),
        credentialId: credential.id,
        createdAt: now(),
      };
      const visitors = [makeVisitor(visited)];

      this.#visitors = Promise.resolve(visitors);
      this.#credential = Promise.resolve(credential);
      this.#metadata = Promise.resolve(metadata);
      this.#authenticator = Promise.resolve(authenticator);

      return { metadata };
    } catch (e) {
      console.log(e);
      return "registration_failed" as const;
    }
  }

  async authenticate({ json, challengeId, visited }: TryAuthenticate) {
    const metadata = await this.#metadata;
    const credential = await this.#credential;
    const visitors = await this.#visitors;

    try {
      const authenticationInfo = await server.verifyAuthentication(
        json as AuthenticationJSON,
        credential,
        {
          origin: this.env.ORIGIN,
          challenge: challengeId,
          userVerified: true,
        },
      );

      const visitor = makeVisitor(visited, authenticationInfo);
      const next = [visitor, ...visitors].slice(0, VISITOR_HISTORY_LENGTH);
      this.#visitors = Promise.resolve(next);

      return { metadata };
    } catch (e) {
      if (e instanceof Error) console.log(e);
      return "authentication_failed" as const;
    }
  }

  /** self destruct the passkey, deleting all the data */
  async destruct() {
    void this.ctx.storage.deleteAll();
    void this.ctx.storage.deleteAlarm();

    // get the metadata before clearing the field so we can return it
    const metadata = await this.#metadata;
    this.#metadata = Promise.reject();
    this.#credential = Promise.reject();
    this.#visitors = Promise.reject();

    return { metadata };
  }
}

export const getVisitedHeaders = (request: Request): VisitedHeaders => {
  return {
    city: request.headers.get("cf-ipcity") ?? undefined,
    country: request.headers.get("cf-ipcountry") ?? undefined,
    continent: request.headers.get("cf-ipcontinent") ?? undefined,
    longitude: request.headers.get("cf-iplongitude") ?? undefined,
    latitude: request.headers.get("cf-iplatitude") ?? undefined,
    region: request.headers.get("cf-region") ?? undefined,
    regionCode: request.headers.get("cf-region-code") ?? undefined,
    metroCode: request.headers.get("cf-metro-code") ?? undefined,
    postalCode: request.headers.get("cf-postal-code") ?? undefined,
    timezone: request.headers.get("cf-timezone") ?? undefined,
  };
};

const makeVisitor = (
  headers: VisitedHeaders,
  authentication?: AuthenticationInfo,
): Visitor => {
  return {
    ...headers,
    timestamp: now(),
    authentication,
  };
};

type Visitor = {
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
  authentication?: AuthenticationInfo | undefined;
  timestamp: string;
};

const now = () => new Date().toISOString();

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
