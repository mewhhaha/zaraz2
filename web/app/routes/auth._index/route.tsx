import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import { authenticate } from "../auth.$/helpers.mts";
import t from "./+types.route";

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  try {
    // Check if the user is authenticated via cookie
    const user = await authenticate(request, env.SECRET_KEY);
    const account = env.OBJECT_USER.get(
      env.OBJECT_USER.idFromString(user.userId),
    );
    return { user, ...(await account.data()) };
  } catch {
    // If authentication fails or cookie is invalid/expired, return undefined user
    return { user: undefined, account: undefined };
  }
};

// Main component for the authentication route
export default function Route({
  loaderData: { user, account },
}: t.ComponentProps) {
  if (user && account) {
    return (
      <main>
        <h1>Passkeys</h1>
        <p>You're logged in as {account.username}</p>
      </main>
    );
  }
  return (
    <main class={`max-w-sm rounded-lg border-2 border-white bg-blue-950 p-4`}>
      <div>
        <h1 class={`font-serif text-xl font-extrabold tracking-widest`}>
          Passkeys
        </h1>
        <p class={`mb-4`}>You're not logged in.</p>
        <div class={`flex flex-col gap-2`}>
          <form fx-action="/auth/verify" fx-method="POST">
            <button
              ext-fx-passkey-verify="/auth/challenge"
              class={`
                w-32 cursor-pointer rounded-lg bg-blue-600/20 px-4 py-2 text-left
                font-semibold text-white

                hover:bg-blue-600/40
              `}
              type="submit"
            >
              <KeyIcon class={`mr-2 inline-block h-[1lh] w-5`} />
              Login
            </button>
          </form>
          <form
            fx-action="/auth/register"
            fx-method="POST"
            class={`flex gap-2`}
          >
            <input
              class={`rounded-lg border-2 px-4`}
              placeholder="Username"
              type="text"
              name="username"
            />
            <button
              ext-fx-passkey-register="/auth/challenge"
              class={`
                w-32 cursor-pointer rounded-lg bg-blue-600/20 px-4 py-2 text-left
                font-semibold text-white

                hover:bg-blue-600/40
              `}
            >
              <UserPlusIcon class={`mr-2 inline-block h-[1lh] w-5`} />
              Register
            </button>
          </form>
          <form fx-action="/auth/recover" fx-method="POST" class={`flex gap-2`}>
            <input
              class={`rounded-lg border-2 px-4`}
              placeholder="Username"
              type="text"
              name="username"
            />
            <button
              type="submit"
              name="username"
              ext-fx-prompt="What username?"
              class={`
                w-32 cursor-pointer rounded-lg bg-blue-600/20 px-4 py-2 text-left
                font-semibold text-white

                hover:bg-blue-600/40
              `}
            >
              <BuoyeIcon class={`mr-2 inline-block h-[1lh] w-5`} />
              Recover
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

const KeyIcon = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      {...props}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
      />
    </svg>
  );
};

const UserPlusIcon = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      {...props}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
      />
    </svg>
  );
};

const BuoyeIcon = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      {...props}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M16.712 4.33a9.027 9.027 0 0 1 1.652 1.306c.51.51.944 1.064 1.306 1.652M16.712 4.33l-3.448 4.138m3.448-4.138a9.014 9.014 0 0 0-9.424 0M19.67 7.288l-4.138 3.448m4.138-3.448a9.014 9.014 0 0 1 0 9.424m-4.138-5.976a3.736 3.736 0 0 0-.88-1.388 3.737 3.737 0 0 0-1.388-.88m2.268 2.268a3.765 3.765 0 0 1 0 2.528m-2.268-4.796a3.765 3.765 0 0 0-2.528 0m4.796 4.796c-.181.506-.475.982-.88 1.388a3.736 3.736 0 0 1-1.388.88m2.268-2.268 4.138 3.448m0 0a9.027 9.027 0 0 1-1.306 1.652c-.51.51-1.064.944-1.652 1.306m0 0-3.448-4.138m3.448 4.138a9.014 9.014 0 0 1-9.424 0m5.976-4.138a3.765 3.765 0 0 1-2.528 0m0 0a3.736 3.736 0 0 1-1.388-.88 3.737 3.737 0 0 1-.88-1.388m2.268 2.268L7.288 19.67m0 0a9.024 9.024 0 0 1-1.652-1.306 9.027 9.027 0 0 1-1.306-1.652m0 0 4.138-3.448M4.33 16.712a9.014 9.014 0 0 1 0-9.424m4.138 5.976a3.765 3.765 0 0 1 0-2.528m0 0c.181-.506.475-.982.88-1.388a3.736 3.736 0 0 1 1.388-.88m-2.268 2.268L4.33 7.288m6.406 1.18L7.288 4.33m0 0a9.024 9.024 0 0 0-1.652 1.306A9.025 9.025 0 0 0 4.33 7.288"
      />
    </svg>
  );
};
