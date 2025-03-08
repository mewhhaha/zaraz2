import * as t from "./+types._root.home";

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

export default function Home({ loaderData }: t.ComponentProps) {
  const { todos } = loaderData;
  const currentIndex = 0; // Using state isn't supported in this framework, use a static value

  const currentTodo = todos[currentIndex];

  if (!currentTodo) {
    return (
      <div class={`flex h-full flex-col items-center justify-center p-6`}>
        <div class={`rounded-xl bg-white p-8 shadow-xl`}>
          <h2 class={`mb-6 text-center text-2xl font-bold text-gray-800`}>
            No todos yet
          </h2>
          <p class={`text-center text-gray-600`}>
            Add some tasks to get started!
          </p>
          <div class={`mt-8 flex justify-center`}>
            <a
              href="/tasks"
              fx-action="/tasks"
              fx-swap="innerHTML"
              fx-target="body"
              class={`
                rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition-colors

                hover:bg-indigo-700

                focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none
              `}
            >
              Add a task
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class={`flex h-full flex-col items-center justify-center p-6`}>
      <div
        class={`w-full max-w-screen-sm rounded-xl bg-white p-8 shadow-xl transition-all duration-500`}
        style="view-transition-name: todo-card-${currentTodo.id}"
      >
        <h2 class={`mb-6 text-center text-2xl font-bold text-gray-800`}>
          Current Task
        </h2>

        <div
          class={`mb-8 overflow-hidden rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 p-6`}
        >
          <p
            class={`text-xl font-medium text-gray-800 transition-all duration-500`}
            style="view-transition-name: todo-text-${currentTodo.id}"
          >
            {currentTodo.text}
          </p>
        </div>

        <div class={`flex justify-between`}>
          <a
            href="/"
            fx-action="/"
            fx-swap="innerHTML"
            fx-target="body"
            class={`
              flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium
              text-white transition-colors

              hover:bg-indigo-700

              focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none
            `}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class={`h-5 w-5`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clip-rule="evenodd"
              />
            </svg>
            Next Task
          </a>

          <a
            href="/tasks"
            fx-action="/tasks"
            fx-swap="innerHTML"
            fx-target="body"
            class={`
              flex items-center gap-2 rounded-lg bg-gray-100 px-5 py-3 text-sm font-medium
              text-gray-800 transition-colors

              hover:bg-gray-200

              focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none
            `}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class={`h-5 w-5`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            Add Task
          </a>
        </div>

        <div class={`mt-6 flex items-center justify-center`}>
          <span class={`text-sm text-gray-500`}>
            Task {(currentIndex + 1).toString()} of {todos.length.toString()}
          </span>
        </div>
      </div>
    </div>
  );
}
