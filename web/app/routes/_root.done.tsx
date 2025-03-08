import * as t from "./+types._root.done";

export const loader = async ({ request }: t.LoaderArgs) => {
  // In a real app, you'd fetch this from a database
  const completedTodos = [
    {
      id: "5",
      text: "Set up project structure",
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
    <div class={`flex h-full flex-col p-6`}>
      <div class={`mx-auto w-full max-w-2xl`}>
        <h1 class={`mb-6 text-3xl font-bold text-gray-800`}>Completed Tasks</h1>

        <div class={`rounded-xl bg-white p-6 shadow-lg`}>
          {completedTodos.length === 0 ? (
            <div class={`py-12 text-center`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class={`mx-auto h-12 w-12 text-gray-400`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 class={`mt-2 text-lg font-medium text-gray-900`}>
                No completed tasks
              </h3>
              <p class={`mt-1 text-gray-500`}>
                You haven't completed any tasks yet.
              </p>
              <div class={`mt-6`}>
                <a
                  href="/tasks"
                  fx-action="/tasks"
                  fx-swap="innerHTML"
                  fx-target="body"
                  class={`
                    inline-flex items-center rounded-md border border-transparent bg-indigo-600
                    px-4 py-2 text-sm font-medium text-white shadow-sm

                    hover:bg-indigo-700

                    focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none
                  `}
                >
                  Go to tasks
                </a>
              </div>
            </div>
          ) : (
            <ul class={`divide-y divide-gray-200`}>
              {completedTodos.map((todo) => (
                <li class={`flex items-start gap-4 py-4`}>
                  <div
                    class={`
                      mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center
                      rounded-full bg-green-500
                    `}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class={`h-3 w-3 text-white`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                  <div class={`flex-1`}>
                    <div class={`flex justify-between`}>
                      <p class={`font-medium text-gray-800 line-through`}>
                        {todo.text}
                      </p>
                      <time
                        class={`text-sm text-gray-500`}
                        datetime={todo.completedAt}
                      >
                        {new Date(todo.completedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </time>
                    </div>
                  </div>
                  <button
                    class={`
                      rounded-lg bg-red-100 p-2 text-red-700

                      hover:bg-red-200

                      focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none
                    `}
                    title="Delete task"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class={`h-5 w-5`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div class={`mt-6 flex justify-center`}>
            <a
              href="/"
              fx-action="/"
              fx-swap="innerHTML"
              fx-target="body"
              class={`
                inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium
                text-gray-700

                hover:bg-gray-200

                focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none
              `}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class={`mr-2 -ml-1 h-5 w-5`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clip-rule="evenodd"
                />
              </svg>
              Back to Current Tasks
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
