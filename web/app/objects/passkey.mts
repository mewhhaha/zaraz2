import { type VisitedHeaders } from "../helpers/headers.js";
import { now } from "../helpers/time.js";
import { server } from "@passwordless-id/webauthn";
import { DurableObject } from "cloudflare:workers";

import type { Env } from "./env.mjs";
import type {
  AuthenticationInfo,
  AuthenticationJSON,
  AuthenticatorInfo,
  CredentialInfo,
  RegistrationJSON,
} from "@passwordless-id/webauthn/dist/esm/types.js";

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

/** @public */
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
  private metadata: Metadata | undefined = undefined;
  private credential: CredentialInfo | undefined = undefined;
  private visitors: Visitor[] = [];
  private authenticator: AuthenticatorInfo | undefined = undefined;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    void state.blockConcurrencyWhile(async () => {
      const load = async (
        key: "metadata" | "credential" | "visitors" | "authenticator",
      ) => {
        const value = await this.ctx.storage.get(key);
        if (value !== undefined) {
          // @ts-expect-error we can't see private variables
          this[key] = value;
        }
      };

      await Promise.all([
        load("metadata"),
        load("credential"),
        load("visitors"),
        load("authenticator"),
      ]);
    });
  }

  async data(userId: string) {
    const { metadata, visitors, authenticator } =
      await this.assertPasskey(userId);

    return { metadata, visitors, authenticator };
  }

  async register({ json, visited, userId, challengeId }: Registration) {
    await this.assertEmpty();
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

      this.credential = credential;
      this.ctx.storage.put("credential", credential);

      this.metadata = metadata;
      this.ctx.storage.put("metadata", metadata);

      this.authenticator = authenticator;
      this.ctx.storage.put("authenticator", authenticator);

      const visitors = [makeVisitor(visited)];

      this.visitors = visitors;
      this.ctx.storage.put("visitors", visitors);

      return { error: false, data: metadata } as const;
    } catch (e) {
      console.log(e);
      return { error: true, message: "registration_failed" } as const;
    }
  }

  async authenticate({ json, challengeId, visited }: TryAuthenticate) {
    const { metadata, credential } = await this.assertPasskey();

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
      const visitors = [visitor, ...this.visitors].slice(
        0,
        VISITOR_HISTORY_LENGTH,
      );
      this.visitors = visitors;
      this.ctx.storage.put("visitors", visitors);

      return { error: false, data: metadata } as const;
    } catch (e) {
      if (e instanceof Error) console.log(e);
      return { error: true, message: "authentication_failed" } as const;
    }
  }

  /** self destruct the passkey, deleting all the data */
  async destruct() {
    void this.ctx.storage.deleteAll();
    void this.ctx.storage.deleteAlarm();

    // get the metadata before clearing the field so we can return it
    const metadata = this.metadata;

    this.metadata = undefined;
    this.credential = undefined;
    this.visitors = [];

    return metadata;
  }

  private async assertPasskey(userId?: string) {
    const metadata = this.metadata;
    const credential = this.credential;
    const visitors = this.visitors;
    const authenticator = this.authenticator;

    if (metadata === undefined) {
      throw new Error("Object is unoccupied");
    }

    if (userId !== undefined && userId !== metadata.userId) {
      throw new Error("UserId mismatch");
    }

    if (credential === undefined) {
      throw new Error("Credential missing");
    }

    return { credential, metadata, userId, visitors, authenticator };
  }

  private async assertEmpty() {
    if (this.metadata !== undefined) {
      throw new Error("Object is occupied");
    }
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