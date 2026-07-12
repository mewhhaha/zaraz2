"use client";

import {
  defineController,
  on,
  type Controller,
} from "@mewhhaha/ruwuter/browser";
import { swapHtml } from "../../helpers/client-swap";
import type { TaskEvent } from "../../helpers/task-events";

export type HomeController = {
  refs: {
    form: HTMLFormElement;
    addTask: HTMLButtonElement;
  };
};

const homeController: Controller<undefined, HomeController["refs"]> =
  defineController<HomeController>(({ refs, signal }) => {
    on(refs.form).submit(
      async (submitEvent) => {
        submitEvent.preventDefault();
        const form = refs.form;
        if (form.dataset.pending === "true") return;
        form.dataset.pending = "true";

        const indicatorTarget = document.querySelector("#task") ?? form;
        indicatorTarget.setAttribute("data-indicator", "");
        const formData = new FormData(form);
        const task = document.querySelector("#task");
        if (task instanceof HTMLElement && task.dataset.taskId) {
          formData.set("id", task.dataset.taskId);
        }
        const submitter = submitEvent.submitter;
        if (submitter instanceof HTMLButtonElement && submitter.name) {
          formData.set(submitter.name, submitter.value);
        }

        const intent = formData.get("intent")?.toString();
        const clientId =
          window.localStorage.getItem("todo:client-id") ?? crypto.randomUUID();
        window.localStorage.setItem("todo:client-id", clientId);
        const previous = Number.parseInt(
          window.localStorage.getItem("todo:client-seq") ?? "0",
          10,
        );
        const seq = (Number.isFinite(previous) ? previous : 0) + 1;
        window.localStorage.setItem("todo:client-seq", String(seq));
        const id = `${clientId}:${seq}`;
        const ts = Date.now();
        let taskEvent: TaskEvent | undefined;
        if (intent === "another") {
          const text = formData.get("another")?.toString().trim();
          if (text) {
            const taskId = crypto.randomUUID();
            taskEvent = {
              id,
              clientId,
              seq,
              ts,
              type: "task.add",
              taskId,
              text,
            };
            formData.set("event_task_id", taskId);
            formData.set("event_text", text);
          }
        } else if (intent === "done") {
          const taskId =
            task instanceof HTMLElement ? task.dataset.taskId : undefined;
          if (taskId) {
            taskEvent = { id, clientId, seq, ts, type: "task.done", taskId };
            formData.set("event_task_id", taskId);
          } else {
            taskEvent = { id, clientId, seq, ts, type: "task.done" };
          }
        } else if (intent === "cycle") {
          taskEvent = { id, clientId, seq, ts, type: "task.cycle" };
        }
        if (!taskEvent) {
          form.dataset.pending = "false";
          indicatorTarget.removeAttribute("data-indicator");
          return;
        }
        formData.set("event_type", taskEvent.type);
        formData.set("event_id", id);
        formData.set("event_client_id", clientId);
        formData.set("event_seq", String(seq));
        formData.set("event_ts", String(ts));

        try {
          const response = await fetch("/home", {
            method: "POST",
            body: formData,
            signal,
          });
          const performSwap = () =>
            swapHtml(response, {
              target: "body",
              write: "innerHTML",
              init: { signal },
              viewTransition: false,
            });
          if (typeof document.startViewTransition === "function") {
            let swapPromise: Promise<unknown> | undefined;
            const viewTransition = document.startViewTransition(() => {
              swapPromise = performSwap();
              return swapPromise;
            });
            await viewTransition.finished;
            await swapPromise;
          } else {
            await performSwap();
          }
          if (intent === "done") {
            const { default: confetti } = await import("canvas-confetti");
            confetti.reset();
            confetti({
              particleCount: 100,
              spread: 180,
              origin: { y: -0.1 },
              startVelocity: -35,
              disableForReducedMotion: true,
            });
          }
          for (const transition of document.querySelectorAll(
            "[data-view-transition]",
          )) {
            transition.removeAttribute("data-view-transition");
          }
        } catch {
          window.alert?.(
            "We could not update your tasks right now. Please try again.",
          );
        } finally {
          indicatorTarget.removeAttribute("data-indicator");
          form.dataset.pending = "false";
        }
      },
      { signal },
    );

    on(refs.addTask).click(
      (clickEvent) => {
        clickEvent.preventDefault();
        const value = window.prompt("What's next?");
        if (!value) return;
        const input = refs.form.elements.namedItem("another");
        if (input instanceof HTMLInputElement) input.value = value;
        refs.form.requestSubmit(refs.addTask);
      },
      { signal },
    );
  });

export default homeController;
