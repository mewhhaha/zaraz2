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

          starting:-translate-x-full starting:blur-3xl
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
          <PrimaryButton type="submit">I'll do it later.</PrimaryButton>
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
