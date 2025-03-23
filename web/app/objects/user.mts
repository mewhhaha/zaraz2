import { DurableObject, RpcTarget } from "cloudflare:workers";
import type { Env } from "./env.mts";

type PasskeyLink = {
  name: string;
  credentialId: string;
  userId: string;
  passkeyId: string;
};

/** @public */
export type Metadata = {
  username: string;
};

/** @public */
export type Recovery = {
  emails: { address: string; verified: boolean; primary: boolean }[];
};

export class DurableObjectUser extends DurableObject<Env> {
  private metadata: Metadata | undefined = undefined;
  private recovery: Recovery = { emails: [] };
  private passkeys: PasskeyLink[] = [];

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    void state.blockConcurrencyWhile(async () => {
      const load = async (key: "metadata" | "recovery" | "passkeys") => {
        const value = await this.ctx.storage.get(key);
        if (value !== undefined) {
          // @ts-expect-error we can't see private variables
          this[key] = value;
        }
      };
      await Promise.all([load("metadata"), load("recovery"), load("passkeys")]);
    });
  }

  async exists() {
    try {
      await this.assertUser();
      return true;
    } catch {
      return false;
    }
  }

  async create({
    email,
    passkey,
    username,
  }: Metadata & { email?: string; passkey?: PasskeyLink }) {
    await this.assertEmpty();

    this.metadata = { username };
    void this.ctx.storage.put("metadata", { username });
    if (email !== undefined) {
      this.recovery = {
        emails: [{ address: email, verified: false, primary: true }],
      };
      void this.ctx.storage.put("recovery", {
        emails: [{ address: email, verified: false, primary: true }],
      });
    }
    if (passkey !== undefined) {
      this.passkeys = [passkey];
      void this.ctx.storage.put("passkeys", [passkey]);
    }
  }

  async data() {
    return await this.assertUser();
  }

  async verifyEmail(unverifiedEmail: string) {
    await this.assertUser();

    const { emails } = this.recovery;
    const email = emails.find((e) => e.address === unverifiedEmail);
    if (email === undefined) {
      return { error: true, message: "missing_email" } as const;
    }

    email.verified = true;
    this.recovery = { emails };
    void this.ctx.storage.put("recovery", { emails });

    return { error: false } as const;
  }

  async addPasskey(link: PasskeyLink) {
    const { passkeys } = await this.assertUser();
    const added = [...passkeys, link];

    this.passkeys = added;
    void this.ctx.storage.put("passkeys", added);
    return { passkeys: added };
  }

  async getPasskey(passkeyId: string) {
    const { passkeys } = await this.assertUser();
    const passkey = passkeys.find((p) => p.passkeyId === passkeyId);
    if (!passkey) {
      throw new Error(`Missing passkey with id ${passkeyId}`);
    }

    const rename = async (name: string) => {
      passkey.name = name;
      this.passkeys = passkeys;
      void this.ctx.storage.put("passkeys", passkeys);

      return { passkeys } as const;
    };

    const remove = async () => {
      const removed = passkeys.filter((p) => p.passkeyId !== passkeyId);
      if (removed.length === passkeys.length) {
        return { error: true, message: "missing_passkey" } as const;
      }

      const passkeyIdFromString =
        this.env.OBJECT_PASSKEY.idFromString(passkeyId);
      const passkey = this.env.OBJECT_PASSKEY.get(passkeyIdFromString);

      this.ctx.waitUntil(passkey.destruct());

      this.passkeys = removed;
      void this.ctx.storage.put("passkeys", removed);

      return { error: false, passkey: removed } as const;
    };

    class RpcTargetPasskey extends RpcTarget {
      rename = rename;
      remove = remove;
    }

    return new RpcTargetPasskey();
  }

  private async assertUser() {
    const metadata = this.metadata;
    const recovery = this.recovery;
    const passkeys = this.passkeys;
    if (metadata === undefined) {
      throw new Error("Object is unoccupied");
    }

    return { metadata, recovery, passkeys };
  }

  private async assertEmpty() {
    if (this.metadata !== undefined) {
      throw new Error("Object is occupied");
    }
  }
}

export const makePasskeyLink = ({
  passkeyId,
  credentialId,
  userId,
}: {
  passkeyId: DurableObjectId | string;
  credentialId: string;
  userId: DurableObjectId | string;
}): PasskeyLink => {
  const passkeyIdString = passkeyId.toString();
  return {
    passkeyId: passkeyIdString,
    credentialId,
    userId: userId.toString(),
    name: `passkey-${passkeyIdString.slice(0, 3) + passkeyIdString.slice(-3)}`,
  };
};
