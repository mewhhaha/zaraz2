import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import * as t from "./+types.route";
import { authenticate } from "../auth.$/helpers.mts";

export const action = async ({ request, context: [env] }: t.ActionArgs) => {
  const user = await authenticate(request, env.SECRET_KEY);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const another = formData.get("another") as string;
  const id = formData.get("id") as string;
  const open = formData.get("open") as string;

  const stub = env.OBJECT_USER.get(env.OBJECT_USER.idFromString(user.userId));

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
  const { userId } = await authenticate(request, env.SECRET_KEY);

  const url = new URL(request.url);
  const direction = url.searchParams.get("direction");
  const confetti = url.searchParams.get("confetti");
  const menuOpen = url.searchParams.has("open");

  const user = env.OBJECT_USER.get(env.OBJECT_USER.idFromString(userId));

  const { current, completed } = await user.listTasks();

  return {
    direction,
    nonce: env.nonce,
    confetti,
    menuOpen,
    current,
    completed,
  };
};

const bgUrl = new URL("./../../assets/happy.jpg", import.meta.url);
const client = new URL("./route.client.mts", import.meta.url);

export default function Home({
  loaderData: { direction, nonce, confetti, menuOpen, current, completed },
}: t.ComponentProps) {
  return (
    <div
      data-empty={current === undefined || undefined}
      class={`relative mx-auto flex size-full max-w-screen-lg flex-col`}
    >
      <script nonce={nonce} type="module" src={client.pathname}></script>
      <div
        class={`
          absolute inset-0 -z-10 m-2 flex justify-center overflow-hidden rounded-lg border-2
          border-gray-400/30 view-name-[background]
        `}
      >
        <img
          src={bgUrl.pathname}
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
                ext-fx-confetti={confetti}
              >
                {current?.text}
              </Task>
              {!current && (
                <div
                  ext-fx-confetti
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
            fx-action={"/home"}
            fx-method="POST"
            fx-target="body"
            fx-swap="innerHTML"
            ext-fx-indicator="#task"
            class={`absolute right-2 bottom-10 flex flex-none grow flex-col items-end gap-2`}
          >
            {current && <input type="hidden" name="id" value={current.id} />}
            <MenuButton name="another" ext-fx-prompt="What's next?">
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
        <footer>
          <div class={`relative`}>
            <button
              aria-label="Passkey menu"
              aria-controls="passkeys-menu"
              class={`
                mb-1 flex size-10 cursor-pointer items-center justify-center rounded-lg
                border-2 border-blue-600 bg-slate-950 p-1 text-white drop-shadow-sm/100
                transition-[border-color_background]

                hover:border-white hover:bg-black

                active:bg-white active:text-black active:text-shadow-sm/100

                peer
              `}
            >
              <PasskeyIcon class={`size-6`} />
            </button>

            <dialog
              id="passkeys-menu"
              class={`
                pointer-events-none absolute inset-0 -top-4 left-1/2 h-56 w-48 -translate-x-1/2
                -translate-y-13/14 rounded-lg border-2 bg-slate-950 mask-t-from-0%
                mask-t-to-50% opacity-0 drop-shadow-sm/100
                transition-[transform_opacity]

                open:-translate-y-full open:opacity-100
                backdrop:bg-black/50
              `}
            >
              <form>
                <input type="password" />
              </form>
            </dialog>
          </div>
        </footer>
      </div>
    </div>
  );
}

type MenuButtonProps = JSX.IntrinsicElements["button"];

const MenuButton = ({ class: className, ...props }: MenuButtonProps) => {
  return (
    <button
      class={cx(
        `
          w-40 cursor-pointer rounded-l-full border-y-2 border-l-2 border-gray-600
          bg-slate-950 px-6 py-4 text-left drop-shadow-sm/100

          hover:w-50 hover:bg-black/90 hover:transition-[width]

          active:border-gray-500 active:bg-white active:text-slate-950 active:text-shadow-sm/100

          disabled:cursor-not-allowed disabled:opacity-50
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
      style=""
      class={cx(
        `
          z-10 h-fit w-fit self-center justify-self-center rounded-full bg-blue-800 px-10 py-2
          text-center font-serif text-4xl text-gray-100 drop-shadow-sm/100
          transition-[opacity_transform] duration-300 text-shadow-lg/100
          view-name-[task]

          data-indicator:opacity-70

          data-last:invisible

          starting:scale-150 starting:opacity-0
        `,
        className,
      )}
      id="task"
      data-view-transition
      {...props}
    >
      {children}
    </div>
  );
};

const cx = (...classes: (string | undefined | false | null)[]) => {
  return classes.filter((x) => !!x).join(" ");
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
