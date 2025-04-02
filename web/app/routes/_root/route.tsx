import * as t from "./+types.route";
import { authenticate } from "../auth.$/helpers.mts";

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  console.log("before authenticate");
  const user = await authenticate(request, env.SECRET_KEY);
  console.log("after authenticate");

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
  console.log("big render");
  return (
    <>
      <input type="hidden" name="expires" value={expires} />
      <script nonce={nonce} type="module" src={client.pathname} />
      {children}
    </>
  );
}
