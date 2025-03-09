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

export default function Tasks({ loaderData }: t.ComponentProps) {
  const { todos } = loaderData;

  return (
    <div class={`mx-auto w-full max-w-screen-sm pt-10`}>
      <form>
        <textarea
          class={`field-sizing-content w-full rounded-lg border-2 border-slate-600 p-2 text-4xl`}
          placeholder="What do you need to do?"
          name="text"
        />
        <button type="submit">I'll do it later.</button>
      </form>
    </div>
  );
}
