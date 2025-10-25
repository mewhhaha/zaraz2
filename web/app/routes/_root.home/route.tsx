import type { JSX } from "@mewhhaha/ruwuter/jsx-runtime";
import type { Route as t } from "./+types.route";
import { events } from "@mewhhaha/ruwuter/events";
import { authenticate } from "../auth.$/helpers.ts";
import { cx } from "../../helpers/style";

const menuHref = new URL("./menu.client.ts", import.meta.url).pathname;
const promptHref = new URL("../auth._index/prompt.client.ts", import.meta.url)
  .pathname;
const bgSrc = new URL("../../assets/happy.jpg", import.meta.url).pathname;

export const action = async ({ request, context: [env] }: t.ActionArgs) => {
  const user = await authenticate(request, env.SECRET_KEY);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const another = formData.get("another") as string;
  const id = formData.get("id") as string;
  const open = formData.get("open") as string;

  const stub = env.OBJECT_USER.get(env.OBJECT_USER.idFromName(user.username));

  if (intent === "done") {
    await stub.completeTask(id);
  }

  if (intent === "cycle") {
    await stub.cycleTasks();
  }

  if (another) {
    await stub.addTask(another);
  }

  const url = new URL(request.url);
  url.searchParams.set("direction", intent === "done" ? "up" : "right");
  if (intent === "done") {
    url.searchParams.set("confetti", "true");
  }

  if (open) {
    url.searchParams.set("open", "");
  }

  return Response.redirect(url.href, 303);
};

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  try {
    const { username } = await authenticate(request, env.SECRET_KEY);

    const url = new URL(request.url);
    const direction = url.searchParams.get("direction");
    const confetti = url.searchParams.get("confetti");

    const user = env.OBJECT_USER.get(env.OBJECT_USER.idFromName(username));

    const { current, completed } = await user.listTasks();

    return {
      authenticated: true,
      direction,
      nonce: env.nonce,
      confetti,
      current,
      completed,
    } as const;
  } catch {
    return { authenticated: false } as const;
  }
};

export default function Home({ loaderData }: t.ComponentProps) {
  if (!loaderData.authenticated) {
    return (
      <div class={`relative mx-auto flex size-full max-w-5xl flex-col`}>
        <div
          class={`
            absolute inset-0 -z-10 m-2 flex justify-center overflow-hidden rounded-lg border-2
            border-gray-400/30 view-name-[background]
          `}
        ></div>
        <main class={`relative flex grow items-center justify-center`}>
          <div
            class={`
              font-serif text-4xl font-extrabold tracking-wider transition-transform
              text-shadow-lg/100 text-shadow-amber-300

              starting:skew-x-165
            `}
          >
            zaraz2
          </div>

          <div class={`absolute top-1 right-1 z-10 view-name-[account]`}>
            <Account />
          </div>
        </main>
      </div>
    );
  }

  const { direction, confetti, current, completed } = loaderData;

  return (
    <div
      data-empty={current === undefined || undefined}
      class={`relative mx-auto flex size-full max-w-5xl flex-col`}
    >
      <div
        class={`
          absolute inset-0 -z-10 m-2 flex justify-center overflow-hidden rounded-lg border-2
          border-gray-400/30 view-name-[background]
        `}
      >
        <img
          src={bgSrc}
          alt=""
          class={`
            grow object-cover object-center blur-2xl transition-[filter] duration-500
            ease-in-out

            in-data-empty:blur-md

            starting:blur-sm
          `}
        />
      </div>
      <div
        class={`relative flex size-full flex-col items-center overflow-hidden view-name-[home]`}
      >
        <main class={`flex size-full`}>
          <div class={`absolute top-1 right-1 z-10 view-name-[account]`}>
            <Account />
          </div>
          <div class={`absolute inset-x-0 top-2 flex justify-center`}>
            <div
              class={`
                rounded-b-2xl border-2 border-t-0 border-gray-400/50 bg-slate-950 px-4 text-gray-300
                shadow-lg
              `}
            >
              You've completed{" "}
              <span
                data-updated={confetti !== null}
                class={`
                  text-white transition-[color_transform_font-size] delay-300 duration-1000
                  view-name-[task-count]

                  data-updated:starting:text-xl data-updated:starting:text-green-300
                `}
                id="task-count"
              >
                {completed.toString().padStart(3, "0")}
              </span>{" "}
              tasks
            </div>
          </div>
          <div class={`flex grow flex-col`}>
            <div class={`h-1/4 w-full`}></div>
            <div
              class={`
                grid place-content-center px-4

                *:[grid-area:1/1]
              `}
            >
              <div class={`rounded-full bg-white p-10 blur-2xl`} />
              <Task
                data-last={current === undefined}
                data-direction={direction}
                data-view-transition={direction !== null}
                class={`
                  view-name-[task]

                  data-last:invisible
                `}
              >
                {current?.text}
              </Task>
              {!current && (
                <div
                  class={`z-10 flex items-center text-xl font-bold text-black`}
                >
                  You did it. You're a real human 🫘.
                </div>
              )}
            </div>
          </div>
        </main>
        <header class={`relative flex w-full justify-end`}>
          <form
            id="menu-form"
            fx-action={menuHref}
            fx-method="POST"
            fx-target="body"
            fx-swap="innerHTML"
            ext-fx-indicator="#task"
            class={`absolute right-2 bottom-10 flex flex-none grow flex-col items-end gap-2`}
          >
            {current && <input type="hidden" name="id" value={current.id} />}
            <MenuButton
              name="another"
              data-prompt="What's next?"
              on={events.click(promptHref)}
            >
              ➕ Another?
            </MenuButton>
            <MenuButton
              name="intent"
              value="cycle"
              disabled={current === undefined}
            >
              ♻️ Cycle?
            </MenuButton>
            <MenuButton
              class={`mt-10`}
              name="intent"
              value="done"
              disabled={current === undefined}
            >
              🎉 Done.
            </MenuButton>
          </form>
        </header>
      </div>
    </div>
  );
}

const Account = () => {
  return (
    <div class={`relative`}>
      <div>
        <button
          type="button"
          aria-label="Passkey menu"
          commandfor="passkeys-menu"
          command="show-modal"
          class={`
            mb-1 flex size-12 cursor-pointer items-center justify-center rounded-full
            border-2 border-blue-600 bg-slate-950 p-1 text-white drop-shadow-sm/100
            transition-[border-color_background]

            [anchor-name:--passkeys]

            hover:border-white hover:bg-black

            active:bg-white active:text-black active:text-shadow-sm/100

            peer
          `}
        >
          <PasskeyIcon class={`size-6`} />
        </button>
      </div>

      <dialog
        id="passkeys-menu"
        popover="auto"
        fx-action="/auth"
        fx-target="#passkeys-settings"
        fx-trigger="toggle"
        ext-fx-trigger-value="newState"
        ext-fx-transition="#passkeys-settings"
        ext-fx-allow-default
        class={`
          fixed overflow-visible bg-transparent

          [position-anchor:--passkeys]

          [position-area:bottom_center]

          backdrop:bg-black/50 backdrop:transition-colors backdrop:view-name-[backdrop]

          starting:backdrop:bg-black/0
        `}
      >
        <button
          type="button"
          aria-label="Close"
          class={`fixed inset-0 -z-10 bg-transparent`}
          commandfor="passkeys-menu"
          command="close"
        />
        <div class={`absolute`} id="passkeys-settings" />
      </dialog>
    </div>
  );
};

type MenuButtonProps = JSX.IntrinsicElements["button"];

const MenuButton = ({ class: className, ...props }: MenuButtonProps) => {
  return (
    <button
      class={cx(
        `
          w-40 cursor-pointer rounded-l-full border-y-2 border-l-2 border-gray-600
          bg-slate-950 px-6 py-4 text-left drop-shadow-sm/100

          hover:bg-black/90 hover:transition-[width]

          not-disabled:active:border-gray-500 not-disabled:active:bg-white not-disabled:active:text-slate-950
          not-disabled:active:text-shadow-sm/100

          disabled:cursor-not-allowed disabled:opacity-50

          pointer-fine:not-disabled:hover:w-50
        `,
        className,
      )}
      {...props}
    />
  );
};

type TaskProps = JSX.IntrinsicElements["p"];

const Task = ({ children, class: className, ...props }: TaskProps) => {
  return (
    <div
      id="task"
      class={cx(
        `
          z-10 h-fit w-fit self-center justify-self-center rounded-full bg-blue-800 px-10 py-2
          text-center font-serif text-4xl text-gray-100 drop-shadow-sm/100
          transition-[opacity_transform] duration-300 text-shadow-lg/100

          data-indicator:opacity-70

          starting:scale-150 starting:opacity-0
        `,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const PasskeyIcon = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M9.496 2a5.25 5.25 0 0 0-2.519 9.857A9.006 9.006 0 0 0 .5 20.228a.751.751 0 0 0 .728.772h5.257c3.338.001 6.677.002 10.015 0a.5.5 0 0 0 .5-.5v-4.669a.95.95 0 0 0-.171-.551 9.02 9.02 0 0 0-4.814-3.423A5.25 5.25 0 0 0 9.496 2Z" />
      <path d="M23.625 10.313c0 1.31-.672 2.464-1.691 3.134a.398.398 0 0 0-.184.33v.886a.372.372 0 0 1-.11.265l-.534.534a.188.188 0 0 0 0 .265l.534.534c.071.07.11.166.11.265v.347a.374.374 0 0 1-.11.265l-.534.534a.188.188 0 0 0 0 .265l.534.534a.37.37 0 0 1 .11.265v.431a.379.379 0 0 1-.097.253l-1.2 1.319a.781.781 0 0 1-1.156 0l-1.2-1.319a.379.379 0 0 1-.097-.253v-5.39a.398.398 0 0 0-.184-.33 3.75 3.75 0 1 1 5.809-3.134ZM21 9.75a1.125 1.125 0 1 0-2.25 0 1.125 1.125 0 0 0 2.25 0Z" />
    </svg>
  );
};
