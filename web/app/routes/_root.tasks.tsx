import * as t from "./+types._root.tasks";

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
  const text = formData.get("text") as string;

  // In a real app, you'd save this to a database
  console.log("Adding new todo:", text);

  return { success: true };
};

export default function Tasks({ children, loaderData }: t.ComponentProps) {
  const { todos } = loaderData;

  return (
    <div class={`flex h-full flex-col p-6`}>
      <div class={`mx-auto mb-8 w-full max-w-2xl`}>
        <h1 class={`mb-6 text-3xl font-bold text-gray-800`}>Task Manager</h1>

        <form
          method="post"
          fx-action="/tasks"
          fx-swap="innerHTML"
          fx-target="body"
          class={`mb-8 rounded-xl bg-white p-6 shadow-lg`}
        >
          <div class={`mb-4`}>
            <label
              for="text"
              class={`mb-1 block text-sm font-medium text-gray-700`}
            >
              New Task
            </label>
            <div class={`flex gap-2`}>
              <input
                type="text"
                id="text"
                name="text"
                placeholder="What needs to be done?"
                required
                class={`
                  flex-1 rounded-lg border-gray-300 shadow-sm

                  focus:border-indigo-500 focus:ring-indigo-500
                `}
              />
              <button
                type="submit"
                class={`
                  inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium
                  text-white shadow-sm

                  hover:bg-indigo-700

                  focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none
                `}
              >
                <svg
                  class={`mr-2 -ml-1 h-5 w-5`}
                  xmlns="http://www.w3.org/2000/svg"
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
              </button>
            </div>
          </div>
        </form>

        <div class={`rounded-xl bg-white p-6 shadow-lg`}>
          <h2 class={`mb-4 text-xl font-semibold text-gray-800`}>
            Current Tasks
          </h2>

          {todos.length === 0 ? (
            <p class={`py-4 text-center text-gray-500`}>
              No tasks yet. Add one above!
            </p>
          ) : (
            <ul class={`divide-y divide-gray-200`}>
              {todos.map((todo) => (
                <li class={`flex items-center gap-4 py-4`}>
                  <div
                    class={`h-5 w-5 flex-shrink-0 rounded-full border-2 border-indigo-600`}
                    style="view-transition-name: todo-checkbox-${todo.id}"
                  />
                  <span
                    class={`flex-1 text-gray-800`}
                    style="view-transition-name: todo-text-${todo.id}"
                  >
                    {todo.text}
                  </span>
                  <button
                    class={`
                      rounded-lg bg-green-100 p-2 text-green-700

                      hover:bg-green-200

                      focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none
                    `}
                    title="Mark as completed"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class={`h-5 w-5`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
