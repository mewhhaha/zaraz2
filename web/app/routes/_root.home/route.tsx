import type { JSX } from "@mewhhaha/ruwuter/jsx-runtime";
import { ref, type Ref } from "@mewhhaha/ruwuter/components";
import type { Route as t } from "./+types.route";
import { cx } from "../../helpers/style";
import { events, event } from "@mewhhaha/ruwuter/events";
import { requireAuth } from "../auth.$/helpers.ts";
import {
  createFallbackTaskEvent,
  parseTaskEvent,
  type TaskEvent,
} from "../../helpers/task-events";

const bgSrc = new URL("../../assets/happy.jpg", import.meta.url).pathname;

export const action = async ({ request, context: [env] }: t.ActionArgs) => {
  let auth: Awaited<ReturnType<typeof requireAuth>>["auth"];
  try {
    ({ auth } = await requireAuth(request, env.SECRET_KEY, env.OBJECT_USER));
  } catch {
    return new Response("unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent")?.toString() ?? null;
  const another = formData.get("another")?.toString() ?? null;
  const id = formData.get("id")?.toString() ?? null;
  const open = formData.get("open")?.toString() ?? null;

  const stub = env.OBJECT_USER.get(env.OBJECT_USER.idFromName(auth.username));

  const parsedEvent = parseTaskEvent(formData);
  const fallbackEvent = parsedEvent
    ? undefined
    : createFallbackTaskEvent(intent, another, id);
  const eventToApply = parsedEvent ?? fallbackEvent;
  if (eventToApply) {
    await stub.applyEvents([eventToApply]);
  }

  const url = new URL(request.url);
  const actionType = parsedEvent?.type ?? fallbackEvent?.type ?? undefined;
  url.searchParams.set(
    "direction",
    actionType === "task.done" ? "up" : "right",
  );
  if (actionType === "task.done") {
    url.searchParams.set("confetti", "true");
  }

  if (open) {
    url.searchParams.set("open", "");
  }

  return Response.redirect(url.href, 303);
};

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
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
      nonce: env.nonce,
      confetti,
      current,
      completed,
    } as const;
  } catch {
    return { authenticated: false } as const;
  }
};

export default function Home({ loaderData }: t.ComponentProps) {
  const inputRef = ref<HTMLInputElement | null>(null);

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
            method="POST"
            id="menu-form"
            action="/home"
            on={events(
              { currentId: current?.id },
              event.submit<HTMLFormElement, { currentId: string | undefined }>(
                async function (this, submitEvent, signal) {
                  "use client";

                  const form = submitEvent.currentTarget;
                  if (form.dataset.pending === "true") {
                    return;
                  }
                  form.dataset.pending = "true";

                  const indicatorTarget =
                    document.querySelector("#task") ?? form;
                  indicatorTarget?.setAttribute("data-indicator", "");

                  const formData = new FormData(submitEvent.currentTarget);
                  const taskEl = document.querySelector("#task");
                  const liveId =
                    taskEl instanceof HTMLElement
                      ? taskEl.dataset.taskId
                      : undefined;
                  if (liveId || this.currentId) {
                    formData.set("id", liveId ?? this.currentId ?? "");
                  }

                  const submitter = submitEvent.submitter;
                  if (
                    submitter instanceof HTMLButtonElement &&
                    submitter.name
                  ) {
                    formData.set(submitter.name, submitter.value);
                  }

                  const intent = formData.get("intent")?.toString();

                  const getClientId = () => {
                    const key = "todo:client-id";
                    const existing = window.localStorage?.getItem(key);
                    if (existing) {
                      return existing;
                    }
                    const next = crypto.randomUUID();
                    window.localStorage?.setItem(key, next);
                    return next;
                  };

                  const nextSeq = () => {
                    const key = "todo:client-seq";
                    const raw = window.localStorage?.getItem(key) ?? "0";
                    const value = Number.parseInt(raw, 10);
                    const seq = Number.isFinite(value) ? value + 1 : 1;
                    window.localStorage?.setItem(key, String(seq));
                    return seq;
                  };

                  const buildEvent = (): TaskEvent | undefined => {
                    if (!intent) {
                      return;
                    }

                    const clientId = getClientId();
                    const seq = nextSeq();
                    const id = `${clientId}:${seq}`;
                    const ts = Date.now();

                    if (intent === "another") {
                      const text = formData.get("another")?.toString().trim();
                      if (!text) {
                        return;
                      }
                      const taskId = crypto.randomUUID();
                      formData.set("event_task_id", taskId);
                      formData.set("event_text", text);
                      formData.set("event_type", "task.add");
                      formData.set("event_id", id);
                      formData.set("event_client_id", clientId);
                      formData.set("event_seq", String(seq));
                      formData.set("event_ts", String(ts));
                      return {
                        id,
                        clientId,
                        seq,
                        ts,
                        type: "task.add",
                        taskId,
                        text,
                      };
                    }

                    if (intent === "done") {
                      const taskId =
                        taskEl instanceof HTMLElement
                          ? taskEl.dataset.taskId
                          : undefined;
                      if (taskId) {
                        formData.set("event_task_id", taskId);
                      }
                      formData.set("event_type", "task.done");
                      formData.set("event_id", id);
                      formData.set("event_client_id", clientId);
                      formData.set("event_seq", String(seq));
                      formData.set("event_ts", String(ts));
                      return {
                        id,
                        clientId,
                        seq,
                        ts,
                        type: "task.done",
                        taskId,
                      };
                    }

                    if (intent === "cycle") {
                      formData.set("event_type", "task.cycle");
                      formData.set("event_id", id);
                      formData.set("event_client_id", clientId);
                      formData.set("event_seq", String(seq));
                      formData.set("event_ts", String(ts));
                      return {
                        id,
                        clientId,
                        seq,
                        ts,
                        type: "task.cycle",
                      };
                    }
                  };

                  const taskEvent = buildEvent();
                  if (!taskEvent) {
                    form.dataset.pending = "false";
                    indicatorTarget?.removeAttribute("data-indicator");
                    return;
                  }

                  try {
                    const response = await fetch("/home", {
                      method: "POST",
                      body: formData,
                      signal,
                    });

                    const performSwap = () =>
                      window.swap(response, {
                        target: "body",
                        swap: "innerHTML",
                      });

                    const supportsViewTransition =
                      typeof document.startViewTransition === "function";
                    let swapPromise: Promise<unknown> | undefined;

                    if (supportsViewTransition) {
                      const viewTransition = document.startViewTransition(
                        () => {
                          swapPromise = performSwap();
                          return swapPromise;
                        },
                      );
                      await viewTransition.finished;
                      await swapPromise;
                    } else {
                      await performSwap();
                    }

                    if (intent === "done") {
                      const { default: confetti } = await import(
                        "canvas-confetti"
                      );
                      confetti.reset();
                      confetti({
                        particleCount: 100,
                        spread: 180,
                        origin: { y: -0.1 },
                        startVelocity: -35,
                        disableForReducedMotion: true,
                      });
                    }

                    const transitions = document.querySelectorAll(
                      "[data-view-transition]",
                    );
                    for (const transition of transitions) {
                      transition.removeAttribute("data-view-transition");
                    }
                  } catch {
                    window.alert?.(
                      "We could not update your tasks right now. Please try again.",
                    );
                  } finally {
                    indicatorTarget?.removeAttribute("data-indicator");
                    form.dataset.pending = "false";
                  }
                },
                { preventDefault: true },
              ),
            )}
            class={`
              absolute right-2 bottom-8 flex flex-none grow flex-col items-end
              gap-2 sm:right-3
            `}
          >
            <input ref={inputRef} type="hidden" name="another" />
            <MenuButton
              name="intent"
              value="another"
              on={events(
                { ref: inputRef },
                event.click<
                  HTMLButtonElement,
                  { ref: Ref<HTMLInputElement | null> }
                >(
                  function (this, ev) {
                    "use client";
                    const value = window.prompt("What's next?");
                    if (!value) {
                      return;
                    }
                    const input = this.ref.get() as HTMLInputElement;
                    input.value = value;
                    ev.currentTarget.form?.requestSubmit(ev.currentTarget);
                  },
                  { preventDefault: true },
                ),
              )}
            >
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
        on={event.toggle<HTMLDialogElement>(async function (evt, signal) {
          "use client";
          const dialog = evt.currentTarget;
          const toggleEvent = evt as Event & { newState?: string };
          if (toggleEvent.newState && toggleEvent.newState !== "open") {
            return;
          }
          if (!dialog.open || signal.aborted) {
            return;
          }
          if (dialog.dataset.pending === "true") {
            return;
          }
          dialog.dataset.pending = "true";

          const targetElement = document.querySelector("#passkeys-settings");
          if (!(targetElement instanceof Element)) {
            dialog.dataset.pending = "false";
            return;
          }
          targetElement.setAttribute("data-indicator", "");

          try {
            const response = await fetch("/auth", {
              signal,
            });

            await window.swap(response, {
              target: targetElement,
              swap: "innerHTML",
              viewTransition: false,
            });
          } catch {
            window.alert?.(
              "We couldn't load your passkey settings. Please try again.",
            );
          } finally {
            targetElement.removeAttribute("data-indicator");
            dialog.dataset.pending = "false";
          }
        })}
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
        <div class={`absolute`} id="passkeys-settings" />
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
