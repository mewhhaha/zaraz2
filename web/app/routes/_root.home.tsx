import * as t from "./+types._root.home";

export const action = async ({ request }: t.ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const another = formData.get("another") as string;

  const init = { headers: new Headers({ "Content-Type": "text/html" }) };

  let response;
  if (another) {
    response = (
      <p
        class={`view-transition-[task]`}
        id="task"
        data-direction="right"
        data-view-transition
      >
        Get selected {new Date().toLocaleTimeString()}
      </p>
    );
  }

  if (intent === "done") {
    response = (
      <p
        class={`view-transition-[task]`}
        id="task"
        data-direction="up"
        data-view-transition
        ext-fx-confetti
      >
        Get done {new Date().toLocaleTimeString()}
      </p>
    );
  }

  if (intent === "cycle") {
    response = (
      <p
        class={`view-transition-[task]`}
        id="task"
        data-direction="right"
        data-view-transition
      >
        Get cycled {new Date().toLocaleTimeString()}
      </p>
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
          <div class={`flex overflow-hidden rounded-b-xl shadow`}>
            <div class={`bg-amber-600 px-4 py-2 text-xl`}>0</div>
            <div class={`bg-sky-600 px-4 py-2 text-xl`}>0</div>
            <div class={`bg-green-600 px-4 py-2 text-xl`}>0</div>
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
            <p class={`view-transition-[task]`} id="task">
              Go to shop and shop
            </p>
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
