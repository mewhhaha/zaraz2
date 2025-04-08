import * as t from "./+types.route";
import { authenticate } from "../auth.$/helpers.mts";

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

const client = new URL("./route.client.mts", import.meta.url);

export default function Root({
  children,
  loaderData: { user, nonce },
}: t.ComponentProps) {
  return (
    <>
      {user && <input type="hidden" name="expires" value={user.expires} />}
      {user && <script nonce={nonce} type="module" src={client.pathname} />}
      {children}
    </>
  );
}
