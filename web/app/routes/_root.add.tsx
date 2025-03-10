import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import * as t from "./+types._root.add";

export const loader = async ({ request }: t.LoaderArgs) => {
  // In a real app, you'd fetch this from a database
  const todos = [
    { id: "1", text: "Build a slick todo app", completed: false },
    { id: "2", text: "Learn about view transitions", completed: false },
    { id: "3", text: "Master Tailwind CSS", completed: false },
    { id: "4", text: "Deploy to production", completed: false },
  ];

  return { todos };
};

export const action = async ({ request }: t.ActionArgs) => {
  const formData = await request.formData();
  const text = formData.get("task") as string;

  return new Response(
    (
      <li
        style={`view-transition-name: A${crypto.randomUUID()}`}
        class={`
          list-none gap-2 text-xl text-gray-200 transition-[transform_filter] duration-300
          ease-in-out

          starting:-translate-y-40 starting:translate-x-1/2 starting:blur-xl starting:scale-200
        `}
      >
        🎟️{" "}
        <span class={`underline decoration-gray-200 decoration-2`}>{text}</span>
      </li>
    ).toString(),
    {
      headers: { "Content-Type": "text/html" },
    },
  );
};

export default function Tasks({ loaderData }: t.ComponentProps) {
  const { todos } = loaderData;

  return (
    <div class={`mx-auto w-full max-w-screen-sm pt-10`}>
      <form
        id="form"
        ext-fx-reset
        fx-action="/add"
        fx-target="#list"
        fx-swap="afterbegin"
        fx-method="post"
      >
        <div
          id="task-input"
          class={`
            relative mb-10 bg-red-500/50 p-1.5 sepia-30

            focus-within:bg-red-500
          `}
        >
          <div class={`relative isolate flex border-2 border-black`}>
            <textarea
              aria-label="Add task"
              required
              class={`
                field-sizing-content w-full border-4 border-dotted border-slate-600 p-4 font-serif text-xl

                focus:border-solid focus:bg-amber-200/10

                sm:text-4xl
              `}
              placeholder="What's pressing?"
              name="task"
            />
            <div class={`absolute inset-0 -z-10 bg-slate-950`}></div>
            <div
              class={`
                absolute top-1/2 left-1/2 -z-10 size-[110%] -translate-x-1/2 -translate-y-1/2
                rounded-4xl bg-gradient-to-r from-red-300 to-blue-200 opacity-10
                blur-md transition-[filter]

                group-hover:blur-xl
              `}
            ></div>
          </div>
        </div>
        <div class={`mb-10 flex justify-center`}>
          <PrimaryButton type="submit">
            I'll do it later{" "}
            <HandRaisedIcon
              class={`
                inline-block h-[0.8lh] flex-none

                group-hover:rotate-360 group-hover:duration-1000
              `}
            />
          </PrimaryButton>
        </div>
      </form>
      <hr />
      <ul id="list" class={`flex flex-col gap-3 pt-4`}></ul>
    </div>
  );
}

type PrimaryButtonProps = JSX.IntrinsicElements["button"];

const PrimaryButton = ({ children, ...props }: PrimaryButtonProps) => {
  return (
    <button
      class={`
        relative flex cursor-pointer items-center justify-center gap-1 rounded-full border-2
        border-slate-500 bg-slate-950 px-4 py-2 text-xl underline decoration-green-300
        decoration-1 shadow shadow-white

        hover:bg-slate-800 hover:decoration-3

        active:outline-2 active:outline-offset-2 active:outline-white

        group
      `}
      {...props}
    >
      <div
        class={`
          pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-red-300 to-blue-200
          blur-md transition-[filter]

          group-hover:blur-sm
        `}
      ></div>
      {children}
    </button>
  );
};

type HandRaisedIconProps = JSX.IntrinsicElements["svg"];

const HandRaisedIcon = (props: HandRaisedIconProps) => {
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
        d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002"
      />
    </svg>
  );
};
