import * as server from "@passwordless-id/webauthn/dist/esm/server.js";
import { DurableObject } from "cloudflare:workers";
import type {
  AuthenticationInfo,
  AuthenticationJSON,
  AuthenticatorInfo,
  CredentialInfo,
  RegistrationJSON,
} from "@passwordless-id/webauthn/dist/esm/types.js";
import type { Env } from "@mewhhaha/ruwuter";
import { createStore, DurableStore } from "../helpers/store";
import type { VisitedHeaders } from "../helpers/visited";

const VISITOR_HISTORY_LENGTH = 10;

type Registration = {
  username: string;
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
  username: string;
  createdAt: string;
};

export type Passkey = {
  credential: CredentialInfo;
  metadata: Metadata;
};

type PasskeyStore = {
  "#metadata": Metadata;
  "#credential": CredentialInfo;
  "#visitors": Visitor[];
  "#authenticator": AuthenticatorInfo;
};

export class DurableObjectPasskey extends DurableObject<Env> {
  private readonly store: DurableStore<PasskeyStore>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.store = createStore(state.storage, {
      "#metadata": () => state.storage.get<Metadata>("#metadata"),
      "#credential": () => state.storage.get<CredentialInfo>("#credential"),
      "#visitors": async () =>
        (await state.storage.get<Visitor[]>("#visitors")) ?? [],
      "#authenticator": () =>
        state.storage.get<AuthenticatorInfo>("#authenticator"),
    });
  }

  async register({ json, visited, username, challengeId }: Registration) {
    const exists = await this.store.get("#metadata").then(
      () => true,
      () => false,
    );
    if (exists) {
      return "passkey_exists" as const;
    }

    try {
      const { authenticator, credential } = await server.verifyRegistration(
        json as RegistrationJSON,
        {
          origin: this.env.ORIGIN,
          challenge: challengeId,
        },
      );
      const metadata: Metadata = {
        username,
        passkeyId: this.ctx.id.toString(),
        credentialId: credential.id,
        createdAt: now(),
      };
      const visitors = [makeVisitor(visited)];

      await Promise.all([
        this.store.set("#visitors", visitors),
        this.store.set("#credential", credential),
        this.store.set("#metadata", metadata),
        this.store.set("#authenticator", authenticator),
      ]);

      return { metadata };
    } catch (e) {
      console.error(e);
      return "registration_failed" as const;
    }
  }

  async authenticate({ json, challengeId, visited }: TryAuthenticate) {
    try {
      const metadata = await this.store.get("#metadata");
      const credential = await this.store.get("#credential");
      const authenticator = await this.store.get("#authenticator");
      const visitors = await this.store.get("#visitors");

      const authenticationInfo = await server.verifyAuthentication(
        json as AuthenticationJSON,
        credential,
        {
          origin: this.env.ORIGIN,
          challenge: challengeId,
          userVerified: true,
          counter: authenticator.counter,
        },
      );

      authenticator.counter = authenticationInfo.counter;
      await this.store.set("#authenticator", authenticator);

      const visitor = makeVisitor(visited, authenticationInfo);
      const next = [visitor, ...visitors].slice(0, VISITOR_HISTORY_LENGTH);
      await this.store.set("#visitors", next);

      return { metadata };
    } catch {
      return "authentication_failed" as const;
    }
  }

  /** self destruct the passkey, deleting all the data */
  async destruct(username: string) {
    const metadata = await this.store.get("#metadata").catch(() => undefined);
    if (!metadata || username !== metadata.username) {
      return "unauthorized" as const;
    }

    await Promise.all([
      this.ctx.storage.deleteAll(),
      this.ctx.storage.deleteAlarm(),
      this.store.delete("#metadata"),
      this.store.delete("#credential"),
      this.store.delete("#visitors"),
      this.store.delete("#authenticator"),
    ]);

    return { metadata };
  }
}

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

export type { VisitedHeaders };
