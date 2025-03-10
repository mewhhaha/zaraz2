import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import * as t from "./+types._root.add";
import { SecondaryButton } from "../components/SecondaryButton";
import { PrimaryButton } from "../components/PrimaryButton";

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
  const text = formData.get("task")?.toString() ?? "";
  const intent = formData.get("intent")?.toString() ?? "do-it-later";

  return new Response(
    (
      <li
        style={`view-transition-name: A${crypto.randomUUID()}`}
        class={`
          max-w-sm list-none gap-2 text-xl text-gray-200 transition-[transform_filter]
          duration-600 ease-in-out

          starting:translate-x-6 starting:-translate-y-74 starting:blur-xl

          sm:starting:translate-x-30 sm:starting:-translate-y-60
        `}
      >
        {intent === "do-it-later" ? (
          <TicketIcon class={`inline-block h-[1lh] text-amber-300`} />
        ) : (
          <CheckBadgeIcon class={`inline-block h-[1lh] text-green-300`} />
        )}
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
    <div class={`relative mx-auto w-full max-w-screen-sm pt-10`}>
      <form
        id="form"
        ext-fx-reset
        fx-action="/add"
        fx-target="#list"
        fx-swap="afterbegin"
        fx-method="post"
      >
        <div class={`min-h-48`}>
          <div
            class={`
              focus-within:[@media(height_<_30rem)]:absolute focus-within:[@media(height_<_30rem)]:top-0
              focus-within:[@media(height_<_30rem)]:left-1/2
              focus-within:[@media(height_<_30rem)]:z-50
              focus-within:[@media(height_<_30rem)]:min-w-xs
              focus-within:[@media(height_<_30rem)]:-translate-x-1/2
              focus-within:[@media(height_<_30rem)]:-translate-y-4
            `}
          >
            <div
              class={`
                relative mx-auto mb-10 max-w-sm bg-red-500/50 p-1.5 sepia-30

                focus-within:bg-red-500
              `}
            >
              <div class={`relative isolate flex border-2 border-black`}>
                <textarea
                  aria-label="Add task"
                  required
                  class={`
                    field-sizing-content min-h-16 w-full border-4 border-dotted border-slate-600 px-4
                    font-serif text-xl

                    focus:border-solid focus:bg-amber-200/10

                    sm:text-3xl
                  `}
                  placeholder="What's pressing?"
                  name="task"
                />
                <div class={`absolute inset-0 -z-10 bg-slate-950`}></div>
                <div
                  class={`
                    absolute top-1/2 left-1/2 -z-10 size-[110%] -translate-x-1/2
                    -translate-y-1/2 rounded-4xl bg-gradient-to-r from-red-300
                    to-blue-200 opacity-10 blur-md transition-[filter]

                    group-hover:blur-xl
                  `}
                />
              </div>
            </div>
          </div>
        </div>
        <div
          class={`
            sticky bottom-4 mb-10 flex flex-wrap-reverse justify-center gap-6 text-xl

            sm:flex-nowrap
          `}
        >
          <SecondaryButton value="do-it-later" name="intent">
            I'll do it later{" "}
            <HandRaisedIcon
              class={`
                inline-block h-[0.8lh] flex-none

                group-hover:rotate-360 group-hover:duration-1000
              `}
            />
          </SecondaryButton>
          <PrimaryButton value="done" name="intent">
            I'm done!{" "}
            <AddCheckCircleIcon
              class={`
                inline-block h-[0.8lh] flex-none

                group-hover:rotate-360 group-hover:duration-1000
              `}
            />
          </PrimaryButton>
        </div>
      </form>
      <h3 class={`font-extrabold text-slate-800`}>Added or completed items</h3>
      <hr />
      <ul id="list" class={`flex flex-col gap-3 pt-4`}></ul>
    </div>
  );
}

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

type AddCheckCircleIcon = JSX.IntrinsicElements["svg"];

const AddCheckCircleIcon = (props: AddCheckCircleIcon) => {
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
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
};

type CheckBadgeIconProps = JSX.IntrinsicElements["svg"];

const CheckBadgeIcon = (props: CheckBadgeIconProps) => {
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

type TicketIconProps = JSX.IntrinsicElements["svg"];

const TicketIcon = (props: TicketIconProps) => {
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
        d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
      />
    </svg>
  );
};
