import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import * as t from "./+types._root.done";

export const loader = async ({ request }: t.LoaderArgs) => {
  // In a real app, you'd fetch this from a database
  const completedTodos = [
    {
      id: "5",
      text: "Set up project structure asdf sadfads sadf fasdf sad asdf asdsda sda sadf sdasadfsdaf sadfsd",
      completed: true,
      completedAt: "2023-06-15",
    },
    {
      id: "6",
      text: "Create basic UI components",
      completed: true,
      completedAt: "2023-06-18",
    },
    {
      id: "7",
      text: "Implement routing",
      completed: true,
      completedAt: "2023-06-20",
    },
    {
      id: "8",
      text: "Add state management",
      completed: true,
      completedAt: "2023-06-22",
    },
  ];

  return { completedTodos };
};

export default function Done({ loaderData }: t.ComponentProps) {
  const { completedTodos } = loaderData;

  return (
    <div class={`mx-auto w-full max-w-screen-sm pt-10`}>
      <h2 class={`sr-only`}>Done</h2>
      <ul class={`flex flex-col gap-20`}>
        {completedTodos.map((todo, i) => {
          const clipDelay = `transition-delay: ${(i + 1) * 0.1}s`;
          const ticketDelay = `transition-delay: ${i * 0.1}s`;
          return (
            <li class={`relative isolate pr-8`}>
              <p class={`mb-4 border-b-2 text-xl text-gray-100`}>{todo.text}</p>
              <div
                class={`
                  relative z-10 flex max-w-sm opacity-50 transition-[transform_opacity]
                  duration-300

                  starting:-translate-x-8 starting:opacity-100
                `}
                style={ticketDelay}
              >
                <div
                  class={`
                    relative grow sepia-100 transition-[filter] duration-300 ease-in-out

                    starting:sepia-30
                  `}
                  style={clipDelay}
                >
                  <div
                    class={`
                      absolute inset-0 -z-20 translate-1 bg-red-500 opacity-40 saturate-50
                      transition-[transform_opacity] duration-300 ease-in-out

                      starting:translate-x-0 starting:translate-y-0 starting:opacity-0
                    `}
                    style={ticketDelay}
                  />
                  <div
                    class={`
                      flex min-h-20 grow border-r-2 border-dotted border-white bg-red-500
                      p-1.5 transition-[filter] duration-300 ease-in-out
                    `}
                  >
                    <div
                      class={`
                        absolute top-1/2 left-0 flex h-13 w-7 -translate-y-1/2 items-center
                        overflow-hidden
                      `}
                    >
                      <div
                        class={`
                          size-6 flex-none -translate-x-1/2 rounded-full border-6
                          border-red-500 bg-slate-950 outline-2 outline-offset-0
                          outline-black
                        `}
                      />
                    </div>
                    <div
                      class={`grow border-2 border-gray-800 bg-orange-100/90`}
                    >
                      <h3
                        class={`
                          mb-4 text-center font-serif text-3xl text-gray-800 uppercase
                          underline decoration-double

                          [text-stroke:4px_white]
                        `}
                      >
                        Task
                      </h3>
                    </div>
                  </div>
                </div>

                <div
                  class={`
                    relative flex translate-x-8 -translate-y-0 rotate-6 sepia-30
                    transition-transform duration-150 ease-in-out

                    starting:translate-x-0 starting:translate-y-0 starting:rotate-0
                  `}
                  style={clipDelay}
                >
                  <div
                    class={`
                      absolute inset-0 -z-10 translate-1 bg-red-500 opacity-40 saturate-50
                      transition-[transform_opacity] duration-300 ease-in-out

                      starting:translate-x-0 starting:translate-y-0 starting:opacity-0
                    `}
                    style={clipDelay}
                  />
                  <div
                    class={`
                      flex min-h-20 grow border-l-2 border-dotted border-white bg-red-500
                      p-1.5 sepia-30
                    `}
                  >
                    <div
                      class={`
                        relative flex w-12 items-center justify-center border-2 border-gray-800
                        bg-orange-100/90
                      `}
                    >
                      <div
                        class={`
                          absolute right-0 flex -rotate-90 transform flex-col items-center
                          justify-center text-sm font-bold text-gray-800 uppercase
                        `}
                      >
                        <BadgeCheckCircleIcon
                          class={`h-[1lh] text-green-600`}
                        />
                        Done
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                class={`
                  mt-4 transition-[transform_opacity] duration-300

                  starting:-translate-x-8 starting:opacity-0
                `}
                style={ticketDelay}
              >
                <button
                  class={`
                    mb-4 flex cursor-pointer items-center gap-1 rounded-lg border-2
                    border-slate-400 bg-slate-950/80 px-4 py-2 text-gray-100 underline
                    decoration-red-700 decoration-1

                    hover:bg-slate-800 hover:decoration-3 hover:opacity-100

                    active:outline-2 active:outline-offset-2 active:outline-white

                    group
                  `}
                  ext-fx-confirm="Are you sure you want to delete this task?"
                  fx-action="/done"
                  fx-method="delete"
                >
                  Delete
                  <TrashIcon class={`
                               mb-0.5 ml-1 hidden h-[0.8lh] align-text-bottom

                               sm:inline-block
                             `} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type TrashIconProps = JSX.IntrinsicElements["svg"];

const TrashIcon = (props: TrashIconProps) => {
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
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
};

type BadgeCheckCircleIconProps = JSX.IntrinsicElements["svg"];

const BadgeCheckCircleIcon = (props: BadgeCheckCircleIconProps) => {
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
        d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
      />
    </svg>
  );
};
