import type { JSX } from "@mewhhaha/ruwuter/jsx-runtime";
import type { Route as t } from "./+types.route";
import { cx } from "../../helpers/style";
import { requireAuth } from "../auth.$/helpers.ts";
import {
  createFallbackTaskEvent,
  parseTaskEvent,
} from "../../helpers/task-events";

import bgSrc from "../../assets/happy.jpg?url&no-inline";
import homeControllerHref from "./home.client.ts?url&no-inline";
import passkeysDialogControllerHref from "./passkeys-dialog.client.ts?url&no-inline";
import { controllerAttributes } from "../../helpers/controller";

const homeControllerAttributes = controllerAttributes(homeControllerHref);
const passkeysDialogControllerAttributes = controllerAttributes(
  passkeysDialogControllerHref,
);

export const action = async ({ request, env }: t.ActionArgs) => {
  const authorized = await requireAuth(
    request,
    env.SECRET_KEY,
    env.OBJECT_USER,
  ).catch(() => null);
  if (!authorized) {
    return new Response("unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent")?.toString() ?? null;
  const another = formData.get("another")?.toString() ?? null;
  const id = formData.get("id")?.toString() ?? null;

  const taskEvent =
    parseTaskEvent(formData) ?? createFallbackTaskEvent(intent, another, id);
  if (taskEvent) {
    const stub = env.OBJECT_USER.get(
      env.OBJECT_USER.idFromName(authorized.auth.username),
    );
    await stub.applyEvents([taskEvent]);
  }

  const url = new URL(request.url);
  url.searchParams.set(
    "direction",
    taskEvent?.type === "task.done" ? "up" : "right",
  );
  if (taskEvent?.type === "task.done") {
    url.searchParams.set("confetti", "true");
  }
  if (formData.get("open")) {
    url.searchParams.set("open", "");
  }

  return Response.redirect(url.href, 303);
};

export const loader = async ({ request, env }: t.LoaderArgs) => {
  try {
    const { auth } = await requireAuth(
      request,
      env.SECRET_KEY,
      env.OBJECT_USER,
    );
    const { username } = auth;

    const url = new URL(request.url);
    const direction = url.searchParams.get("direction");
    const confetti = url.searchParams.get("confetti");

    const user = env.OBJECT_USER.get(env.OBJECT_USER.idFromName(username));

    const { current, completed } = await user.listTasks();

    return {
      authenticated: true,
      direction,
      confetti,
      current,
      completed,
    } as const;
  } catch {
    return { authenticated: false } as const;
  }
};

export default function Home({
  loaderData,
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  if (!loaderData.authenticated) {
    return (
      <div class={`relative isolate mx-auto flex size-full max-w-5xl flex-col`}>
        <div
          class={`
            absolute inset-0 -z-10 m-2 overflow-hidden rounded-lg border
            border-white/10 bg-zinc-950 view-name-[background]
          `}
        >
          <img
            src={bgSrc}
            alt=""
            class={`
              size-full object-cover object-center opacity-55 blur-xl
              saturate-125
            `}
          />
          <div
            aria-hidden="true"
            class={`
              absolute inset-0 bg-linear-to-b from-black/55 via-zinc-950/55
              to-black/75
            `}
          />
        </div>
        <main class={`relative flex grow items-center justify-center`}>
          <div
            class={`
              text-balance font-serif text-5xl font-semibold tracking-tight
              text-amber-100 transition-transform
              starting:skew-x-165
            `}
          >
            zaraz2
          </div>

          <div class={`absolute top-1 right-1 z-10 view-name-[account]`}>
            <Account />
          </div>
        </main>
      </div>
    );
  }

  const { direction, confetti, current, completed } = loaderData;

  return (
    <div
      id="home-root"
      data-empty={current === undefined || undefined}
      class={`relative isolate mx-auto flex size-full max-w-5xl flex-col`}
    >
      <div
        class={`
          absolute inset-0 -z-10 m-2 overflow-hidden rounded-lg border
          border-white/10 bg-zinc-950 view-name-[background]
        `}
      >
        <img
          src={bgSrc}
          alt=""
          class={`
            size-full object-cover object-center opacity-70 blur-xl
            saturate-125 transition-[filter_opacity] duration-500 ease-in-out
            in-data-empty:opacity-45 in-data-empty:blur-md
            starting:blur-sm
          `}
        />
        <div
          aria-hidden="true"
          class={`
            absolute inset-0 bg-linear-to-b from-black/50 via-zinc-950/40
            to-black/70
          `}
        />
      </div>
      <div
        class={`
          relative flex size-full flex-col items-center overflow-hidden
          view-name-[home]
        `}
      >
        <main class={`relative z-10 flex size-full`}>
          <div class={`absolute top-1 right-1 z-10 view-name-[account]`}>
            <Account />
          </div>
          <div class={`absolute inset-x-0 top-2 flex justify-center`}>
            <div
              class={`
                rounded-b-lg border border-t-0 border-white/10 bg-zinc-950/90
                px-3 py-1 text-base/7 text-zinc-300 shadow-lg
                shadow-black/30 backdrop-blur
                sm:text-sm/6
              `}
            >
              You've completed{" "}
              <span
                data-updated={confetti !== null}
                class={`
                  tabular-nums text-white transition-[color_transform_font-size]
                  delay-300 duration-1000 view-name-[task-count]
                  data-updated:starting:text-xl
                  data-updated:starting:text-emerald-300
                `}
                id="task-count"
              >
                {completed.toString().padStart(3, "0")}
              </span>{" "}
              tasks
            </div>
          </div>
          <div class={`flex grow flex-col`}>
            <div class={`h-1/4 w-full`}></div>
            <div
              class={`
                grid place-content-center px-4
                *:[grid-area:1/1]
              `}
            >
              <Task
                data-task-id={current?.id}
                data-task-text={current?.text}
                data-last={current === undefined}
                data-direction={direction}
                data-view-transition={direction !== null}
                hidden={current === undefined}
                class={`
                  view-name-[task]
                  data-last:invisible
                `}
              >
                {current?.text}
              </Task>
              <div
                id="task-empty"
                hidden={current !== undefined}
                class={`
                  z-10 flex max-w-[24ch] items-center text-center text-2xl
                  font-medium text-amber-100
                `}
              >
                You did it. Nothing left for now.
              </div>
            </div>
          </div>
        </main>
        <header class={`relative z-10 flex w-full justify-end`}>
          <form
            {...homeControllerAttributes}
            data-rw-ref="form"
            method="POST"
            id="menu-form"
            action="/home"
            class={`
              absolute right-2 bottom-8 flex flex-none grow flex-col items-end
              gap-2 sm:right-3
            `}
          >
            <input type="hidden" name="another" />
            <MenuButton data-rw-ref="addTask" name="intent" value="another">
              Add task
            </MenuButton>
            <MenuButton
              name="intent"
              value="cycle"
              id="btn-cycle"
              disabled={current === undefined}
            >
              Cycle
            </MenuButton>
            <MenuButton
              class={`mt-6 override:bg-amber-200 override:text-zinc-950 override:ring-1 override:ring-amber-200 override:not-disabled:hover:bg-amber-100`}
              name="intent"
              value="done"
              id="btn-done"
              disabled={current === undefined}
            >
              Done
            </MenuButton>
          </form>
        </header>
      </div>
    </div>
  );
}

const Account = () => {
  return (
    <div class={`relative`}>
      <div>
        <button
          type="button"
          aria-label="Passkey menu"
          commandfor="passkeys-menu"
          command="show-modal"
          class={`
            peer mb-1 flex size-12 cursor-pointer items-center justify-center
            rounded-full border border-white/10 bg-zinc-950/90 p-1
            text-amber-100 shadow-lg shadow-black/30
            backdrop-blur transition-[border-color_background]
            [anchor-name:--passkeys]
            hover:border-amber-200/60 hover:bg-black
            active:bg-white active:text-zinc-950
          `}
        >
          <PasskeyIcon class={`size-6`} />
        </button>
      </div>

      <dialog
        id="passkeys-menu"
        popover="auto"
        {...passkeysDialogControllerAttributes}
        class={`
          fixed overflow-visible bg-transparent
          [position-anchor:--passkeys]
          [position-area:bottom_center]
          backdrop:bg-black/50 backdrop:transition-colors
          backdrop:view-name-[backdrop]
          starting:backdrop:bg-black/0
        `}
      >
        <button
          type="button"
          aria-label="Close"
          class={`fixed inset-0 -z-10 bg-transparent`}
          commandfor="passkeys-menu"
          command="close"
        />
        <div data-rw-ref="settings" class={`absolute`} id="passkeys-settings" />
      </dialog>
    </div>
  );
};

type MenuButtonProps = JSX.IntrinsicElements["button"];

const MenuButton = ({ class: className, ...props }: MenuButtonProps) => {
  return (
    <button
      class={cx(
        `
          w-40 cursor-pointer rounded-l-full border-y-2 border-l-2
          border-white/10 bg-zinc-950/90 px-5 py-3 text-left text-base/7
          font-medium shadow-lg shadow-black/30 backdrop-blur
          not-disabled:hover:bg-black/90 not-disabled:hover:transition-[width]
          not-disabled:active:border-white/20 not-disabled:active:bg-white
          not-disabled:active:text-zinc-950 sm:text-sm/6
          disabled:cursor-not-allowed disabled:opacity-50
          pointer-fine:not-disabled:hover:w-44
        `,
        className,
      )}
      {...props}
    />
  );
};

type TaskProps = JSX.IntrinsicElements["p"];

const Task = ({ children, class: className, ...props }: TaskProps) => {
  return (
    <div
      id="task"
      class={cx(
        `
          z-10 size-full self-center justify-self-center rounded-lg
          border border-white/15 bg-zinc-950/85 px-8 py-5 text-center
          font-serif text-4xl font-medium tracking-tight text-amber-100
          shadow-2xl shadow-black/40 backdrop-blur-md
          transition-[opacity_transform] duration-300
          data-indicator:opacity-70
          starting:scale-150 starting:opacity-0
        `,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const PasskeyIcon = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M9.496 2a5.25 5.25 0 0 0-2.519 9.857A9.006 9.006 0 0 0 .5 20.228a.751.751 0 0 0 .728.772h5.257c3.338.001 6.677.002 10.015 0a.5.5 0 0 0 .5-.5v-4.669a.95.95 0 0 0-.171-.551 9.02 9.02 0 0 0-4.814-3.423A5.25 5.25 0 0 0 9.496 2Z" />
      <path d="M23.625 10.313c0 1.31-.672 2.464-1.691 3.134a.398.398 0 0 0-.184.33v.886a.372.372 0 0 1-.11.265l-.534.534a.188.188 0 0 0 0 .265l.534.534c.071.07.11.166.11.265v.347a.374.374 0 0 1-.11.265l-.534.534a.188.188 0 0 0 0 .265l.534.534a.37.37 0 0 1 .11.265v.431a.379.379 0 0 1-.097.253l-1.2 1.319a.781.781 0 0 1-1.156 0l-1.2-1.319a.379.379 0 0 1-.097-.253v-5.39a.398.398 0 0 0-.184-.33 3.75 3.75 0 1 1 5.809-3.134ZM21 9.75a1.125 1.125 0 1 0-2.25 0 1.125 1.125 0 0 0 2.25 0Z" />
    </svg>
  );
};
