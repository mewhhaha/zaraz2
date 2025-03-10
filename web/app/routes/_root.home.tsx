import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
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

export const action = async ({ request }: t.ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  return new Response(
    (
      <TicketView data-direction={intent === "done" ? "up" : "right"}>
        <Ticket />
        <p
          ext-fx-confetti={intent === "done" ? "true" : undefined}
          class={`
            -mt-8 mb-10 text-center font-serif text-4xl underline backdrop-blur-xs

            sm:text-6xl

            peer
          `}
        >
          Get elected
        </p>
      </TicketView>
    ).toString(),
    {
      headers: {
        "Content-Type": "text/html",
      },
    },
  );
};

export default function Home({ loaderData }: t.ComponentProps) {
  const { todos } = loaderData;
  const currentIndex = 0; // Using state isn't supported in this framework, use a static value

  return (
    <div class={`mx-auto w-full max-w-screen-sm`}>
      <h2 class={`sr-only`}>Home</h2>
      <section class={`flex flex-col pt-10`}>
        <TicketView>
          <Ticket />
          <p
            class={`
              -mt-8 mb-10 text-center font-serif text-4xl underline backdrop-blur-xs

              sm:text-6xl

              peer
            `}
          >
            Go shopping on Friday
          </p>
        </TicketView>

        <form
          fx-action="/home"
          fx-method="post"
          fx-target={`#todo`}
          class={`
            flex flex-wrap-reverse justify-center gap-8 text-xl

            sm:flex-nowrap
          `}
        >
          <SecondaryButton value="what-else" name="intent">
            What else?{" "}
            <ArrowPathIcon
              class={`
                inline-block h-[0.8lh] flex-none transform transition-transform ease-in-out

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
        </form>
      </section>
    </div>
  );
}

const Ticket = () => {
  return (
    <div class={`relative mx-auto flex max-w-sm opacity-20`}>
      <div class={`relative grow sepia-30`}>
        <div
          class={`flex min-h-20 grow border-r-2 border-dotted border-white bg-red-500 p-1.5`}
        >
          <div
            class={`absolute top-1/2 left-0 flex h-13 w-7 -translate-y-1/2 items-center overflow-hidden`}
          >
            <div
              class={`
                size-6 flex-none -translate-x-1/2 rounded-full border-6 border-red-500
                bg-slate-950 outline-2 outline-offset-0 outline-black
              `}
            />
          </div>
          <div class={`grow border-2 border-gray-800 bg-orange-100/90`}>
            <h3
              class={`
                mb-4 text-center font-serif text-3xl text-gray-800 uppercase underline
                decoration-double

                [text-stroke:4px_white]
              `}
            >
              Task
            </h3>
          </div>
        </div>
      </div>

      <div class={`relative flex sepia-30`}>
        <div
          class={`flex min-h-20 grow border-l-2 border-dotted border-white bg-red-500 p-1.5`}
        >
          <div
            class={`
              relative flex w-12 items-center justify-center border-2 border-gray-800
              bg-orange-100/90
            `}
          >
            <div
              class={`
                absolute right-0 flex -rotate-90 transform flex-col items-center justify-center
                text-sm font-bold text-gray-800 uppercase
              `}
            >
              <BadgeCheckCircleIcon class={`h-[1lh] text-green-600`} />
              Done
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type SecondaryButtonProps = JSX.IntrinsicElements["button"];

const SecondaryButton = ({ children, ...props }: SecondaryButtonProps) => {
  return (
    <button
      class={`
        flex cursor-pointer items-center justify-center gap-1 rounded-full border-2
        border-slate-500 px-4 py-2 underline decoration-gray-200 decoration-1

        hover:bg-slate-800 hover:decoration-3

        active:outline-2 active:outline-offset-2 active:outline-white

        group
      `}
      {...props}
    >
      {children}
    </button>
  );
};

type PrimaryButtonProps = JSX.IntrinsicElements["button"];

const PrimaryButton = ({ children, ...props }: PrimaryButtonProps) => {
  return (
    <button
      class={`
        relative flex cursor-pointer items-center justify-center gap-1 rounded-full border-2
        border-slate-500 bg-slate-950 px-4 py-2 underline decoration-green-300
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

type ArrowPathIconProps = JSX.IntrinsicElements["svg"];

const ArrowPathIcon = (props: ArrowPathIconProps) => {
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
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
};

type TicketViewProps = JSX.IntrinsicElements["div"];

const TicketView = ({ children, ...props }: TicketViewProps) => {
  return (
    <div
      id="todo"
      style={`
        view-transition-name: todo;
      `}
      class={`
        relative min-h-48 view-name-[todo]

        sm:min-h-64
      `}
      {...props}
    >
      {children}
    </div>
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
