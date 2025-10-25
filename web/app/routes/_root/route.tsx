import type { Route as t } from "./+types.route";
import { authenticate } from "../auth.$/helpers.ts";

const clientUrl = new URL("./route.client.ts", import.meta.url).pathname;

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  try {
    const user = await authenticate(request, env.SECRET_KEY);

    return {
      nonce: env.nonce,
      user,
    };
  } catch {
    return {
      nonce: env.nonce,
      user: null,
    };
  }
};

export default function Root({
  children,
  loaderData: { user, nonce },
}: t.ComponentProps) {
  return (
    <>
      {user && <input type="hidden" name="expires" value={user.expires} />}
      {user && (
        <input type="hidden" name="credential-id" value={user.credentialId} />
      )}
      <script nonce={nonce} type="module" src={clientUrl} />
      {children}
    </>
  );
}
