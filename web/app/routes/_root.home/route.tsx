import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import * as t from "./+types.route";
import { authenticate } from "../../helpers/auth.mts";

export const action = async ({ request, context: [env] }: t.ActionArgs) => {
  const user = await authenticate(request, env);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const another = formData.get("another") as string;
  const id = formData.get("id") as string;

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

  return Response.redirect(url, 303);
};

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  const user = await authenticate(request, env);

  const url = new URL(request.url);
  const direction = url.searchParams.get("direction");
  const confetti = url.searchParams.get("confetti");
  const menuOpen = url.searchParams.has("open");

  const stub = env.OBJECT_USER.get(env.OBJECT_USER.idFromString(user.userId));
  const { tasks, completed } = await stub.listTasks();

  return {
    direction,
    nonce: env.nonce,
    confetti,
    menuOpen,
    current: tasks.at(0),
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
                grid place-content-center px-2

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
                  ext-fx-confetti={confetti}
                  class={`z-10 flex items-center text-xl font-bold text-black`}
                >
                  You did it. You're a real human 🫘.
                </div>
              )}
            </div>
          </div>
        </main>
        <header class={`relative flex w-full justify-end`}>
          <details
            open={menuOpen}
            class={`
              absolute right-0 bottom-4 mr-2 flex h-64 flex-col justify-between gap-4 rounded-l-lg
              border-y-2 border-l-2 border-gray-400/50 bg-slate-950 py-2 pl-18
              text-gray-200 shadow-lg view-name-[menu]

              sm:bottom-20

              [&::details-content]:w-0 [&::details-content]:transition-[width]

              open:[&::details-content]:w-40 
            `}
          >
            <summary
              id="menu-button"
              fx-action=""
              ext-fx-drop
              class={`
                absolute inset-y-0 left-0 m-2 flex items-center rounded-xl py-2 font-bold
                tracking-widest uppercase

                marker:text-slate-400

                hover:bg-black/90
              `}
            >
              <div class={`rotate-270 cursor-pointer`}>
                <span class={`in-open:hidden`}>Open</span>
                <span
                  class={`
                    hidden

                    in-open:inline
                  `}
                >
                  Close
                </span>
              </div>
            </summary>
            <div class={`flex overflow-hidden`}>
              <form
                fx-action={"/home" + (menuOpen ? "?open=" : "")}
                fx-method="POST"
                fx-target="body"
                fx-swap="innerHTML"
                class={`flex flex-none grow flex-col pr-4`}
              >
                {current && (
                  <input type="hidden" name="id" value={current.id} />
                )}
                <MenuButton name="another" ext-fx-prompt="What's next?">
                  Another? ➕
                </MenuButton>
                <MenuButton
                  name="intent"
                  value="cycle"
                  disabled={current === undefined}
                >
                  Cycle? ♻️
                </MenuButton>
                <MenuButton
                  class={`
                    mt-11.25

                    override:border-2 override:border-gray-800
                  `}
                  name="intent"
                  value="done"
                  disabled={current === undefined}
                >
                  Done. 🎉
                </MenuButton>
              </form>
            </div>
          </details>
        </header>
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
          cursor-pointer rounded-xl border-4 border-transparent px-6 py-4

          hover:bg-black/90

          active:border-gray-500 active:bg-white active:text-slate-950

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
      class={cx(
        `
          z-10 h-fit w-fit self-center justify-self-center rounded-full bg-blue-800 px-10 py-2
          text-center font-serif text-4xl text-gray-100 transition-[opacity_transform]
          duration-300 view-name-[task]

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
