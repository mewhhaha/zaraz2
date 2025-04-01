import * as t from "./+types.route";
import { authenticate } from "../auth.$/helpers.mts";

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  const user = await authenticate(request, env.SECRET_KEY);

  return {
    nonce: env.nonce,
    user,
  };
};

const client = new URL("./route.client.mts", import.meta.url);

export default function Root({
  children,
  loaderData: {
    user: { expires },
    nonce,
  },
}: t.ComponentProps) {
  return (
    <>
      <input type="hidden" name="expires" value={expires} />
      <script nonce={nonce} type="module" src={client.pathname} />
      {children}
    </>
  );
}
