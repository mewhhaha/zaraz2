import type * as t from "./+types.route.js";

export const action = async ({
  request,
  context: [env, ctx],
}: t.ActionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const formData = await request.formData();
  const username = formData.get("username")?.toString();
  if (!username) {
    return new Response("username_missing", { status: 403 });
  }

  const sendEmail = async () => {
    const stub = env.OBJECT_USER.get(env.OBJECT_USER.idFromName(username));

    const recovery = await stub.attemptRecovery();
    if (recovery.error) {
      console.error(recovery.message);
      return;
    }

    const forgotten = env.OBJECT_FORGOTTEN.get(
      env.OBJECT_FORGOTTEN.newUniqueId(),
    );
    const result = await forgotten.create(recovery.email, username);
    if (result.error) {
      console.error(result.message);
    }
  };

  ctx.waitUntil(sendEmail());

  return new Response(
    (
      <span class={`bg-black px-2 py-1 text-white`}>
        We sent the email with the link
      </span>
    ).toString(),
    {
      headers: {
        "Content-Type": "text/html",
      },
    },
  );
};

export const loader = ({ context: [env] }: t.LoaderArgs) => {
  return {
    nonce: env.nonce,
  };
};

const client = new URL("./route.client.mts", import.meta.url);

export default function Route({ loaderData: { nonce } }: t.ComponentProps) {
  return (
    <>
      <script nonce={nonce} type="module" src={client.pathname}></script>
      <form fx-action="/auth/forgotten" fx-method="POST" fx-swap="outerHTML">
        <button ext-fx-prompt="What's your username?" name="username">
          RECLAIM YOUR PASSKEY
        </button>
      </form>
    </>
  );
}
