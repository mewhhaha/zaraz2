import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import * as t from "./+types._root.home";

export const action = async ({ request }: t.ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const another = formData.get("another") as string;

  const init = { headers: new Headers({ "Content-Type": "text/html" }) };

  let response;
  if (another) {
    response = (
      <Task id="task" data-direction="right" data-view-transition>
        {another}
      </Task>
    );
  }

  if (intent === "done") {
    response = (
      <Task id="task" data-direction="up" data-view-transition ext-fx-confetti>
        After done {new Date().toLocaleTimeString()}
      </Task>
    );
  }

  if (intent === "cycle") {
    response = (
      <Task id="task" data-direction="right" data-view-transition>
        Get cycled {new Date().toLocaleTimeString()}
      </Task>
    );
  }

  if (!response) {
    throw new Response("Error", { status: 401 });
  }

  return new Response(response.toString(), init);
};

export default function Home({ loaderData }: t.ComponentProps) {
  return (
    <div
      class={`
        relative flex size-full flex-col items-center overflow-hidden backdrop-blur-3xl
        transition-[backdrop-filter] duration-500 ease-in-out

        starting:backdrop-blur-sm
      `}
    >
      <main class={`flex size-full`}>
        <div class={`absolute inset-x-0 top-0 flex justify-center`}>
          <div class={`rounded-b-2xl bg-black px-4 text-gray-300`}>
            You've completed{" "}
            <span class={`text-white`} id="task-count">
              000
            </span>{" "}
            tasks
          </div>
        </div>
        <div
          class={`
            grid grow place-content-center

            *:[grid-area:1/1]
          `}
        >
          <div
            class={`
              grow scale-120 rounded-full bg-amber-700 blur-md
              transition-[filter_transform_opacity] duration-500

              starting:scale-200 starting:opacity-50 starting:blur-sm
            `}
          ></div>
          <div
            class={`
              z-10 h-fit w-fit self-center justify-self-center px-4 text-center font-serif
              text-4xl text-gray-100 transition-[opacity_transform] duration-300

              starting:scale-150 starting:opacity-0
            `}
          >
            <Task>Go to shop and shop</Task>
          </div>
        </div>
      </main>
      <header class={`flex w-full justify-center`}>
        <form
          fx-action="/home"
          fx-method="POST"
          fx-target="#task"
          class={`
            flex h-12 w-full max-w-screen-md justify-between gap-4 bg-black px-4 text-gray-200

            md:rounded-t-lg
          `}
        >
          <button
            name="another"
            class={`cursor-pointer underline`}
            ext-fx-prompt="What's next?"
          >
            Another? ➕
          </button>
          <button
            name="intent"
            value="cycle"
            class={`cursor-pointer underline`}
          >
            Cycle? ♻️
          </button>
          <button name="intent" value="done" class={`cursor-pointer underline`}>
            Done. 🎉
          </button>
        </form>
      </header>
    </div>
  );
}

type TaskProps = JSX.IntrinsicElements["p"];

const Task = ({ children, class: className }: TaskProps) => {
  return (
    <p
      class={cx(`bg-black px-2 py-1 view-transition-[task]`, className)}
      id="task"
    >
      {children}
    </p>
  );
};

const cx = (...classes: (string | undefined | false | null)[]) => {
  return classes.filter((x) => !!x).join(" ");
};
