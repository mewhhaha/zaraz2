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

  throw Response.redirect(url, 303);
};

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  const user = await authenticate(request, env);
  const url = new URL(request.url);
  const direction = url.searchParams.get("direction");
  const confetti = url.searchParams.get("confetti");

  const stub = env.OBJECT_USER.get(env.OBJECT_USER.idFromString(user.userId));
  const { tasks, completed } = await stub.listTasks();

  return { direction, confetti, current: tasks.at(0), completed };
};

export default function Home({
  loaderData: { direction, confetti, current, completed },
}: t.ComponentProps) {
  return (
    <div
      data-empty={current === undefined || undefined}
      class={`
        relative flex size-full flex-col items-center overflow-hidden backdrop-blur-2xl
        transition-[backdrop-filter] duration-500 ease-in-out view-name-[home]

        data-empty:backdrop-blur-md

        starting:backdrop-blur-sm
      `}
    >
      <main class={`flex size-full`}>
        <div class={`absolute inset-x-0 top-0 flex justify-center`}>
          <div class={`rounded-b-2xl bg-black px-4 text-gray-300`}>
            You've completed{" "}
            <span
              data-updated={confetti !== null}
              class={`
                text-white transition-[color_transform_font-size]

                duration-1000 view-name-[task-count] delay-300

                data-updated:starting:text-xl data-updated:starting:text-green-300
              `}
              id="task-count"
            >
              {completed.toString().padStart(3, "0")}
            </span>{" "}
            tasks
          </div>
        </div>
        <div
          class={`
            grid grow place-content-center px-2

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
      </main>
      <header class={`flex w-full justify-center`}>
        <form
          fx-action="/home"
          fx-method="POST"
          fx-target="body"
          fx-swap="innerHTML"
          class={`
            flex h-12 w-full max-w-screen-md justify-between gap-4 bg-black px-4 text-gray-200

            md:rounded-t-lg
          `}
        >
          {current && <input type="hidden" name="id" value={current.id} />}
          <button
            name="another"
            class={`cursor-pointer underline active:text-red-500 delay-200 transition-colors`}
            ext-fx-prompt="What's next?"
          >
            Another? ➕
          </button>
          <button
            name="intent"
            value="cycle"
            disabled={current === undefined}
            class={`
              cursor-pointer underline active:text-red-500 delay-200 transition-colors

              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            Cycle? ♻️
          </button>
          <button
            name="intent"
            value="done"
            class={`
              cursor-pointer underline active:text-red-500 delay-200 transition-colors

              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            disabled={current === undefined}
          >
            Done. 🎉
          </button>
        </form>
      </header>
    </div>
  );
}

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
