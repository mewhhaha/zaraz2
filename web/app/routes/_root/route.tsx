import * as t from "./+types.route";
import { authenticate } from "../../helpers/auth.mts";

const bgUrl = new URL("./../../assets/happy.jpg", import.meta.url);

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  const user = await authenticate(request, env);

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
      <div class={`absolute inset-0 -z-10 flex justify-center`}>
        <img
          src={bgUrl.pathname}
          alt=""
          class={`w-full max-w-screen-lg object-center object-cover view-name-[background]`}
        />
      </div>
      {children}
    </>
  );
}
