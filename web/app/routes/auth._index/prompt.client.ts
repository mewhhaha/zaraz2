/// <reference lib="dom" />

type PromptEvent = Event & {
  stopImmediatePropagation?: () => void;
};

export default function promptHandler(ev: PromptEvent) {
  const trigger = ev.currentTarget;
  if (!(trigger instanceof HTMLElement)) {
    return;
  }

  const message = trigger.getAttribute("data-prompt");
  if (!message) {
    return;
  }

  const form = trigger.closest("form");
  const targetSelector = trigger.getAttribute("data-prompt-target");
  let targetInput: HTMLInputElement | null = null;

  if (targetSelector) {
    targetInput =
      (form?.querySelector<HTMLInputElement>(targetSelector) ??
        document.querySelector<HTMLInputElement>(targetSelector)) ?? null;
  }

  const defaultValue =
    trigger.getAttribute("data-prompt-default") ??
    targetInput?.value ??
    (trigger instanceof HTMLInputElement || trigger instanceof HTMLButtonElement
      ? trigger.value
      : "");

  const value = window.prompt(message, defaultValue || undefined);
  if (value == null) {
    ev.preventDefault();
    ev.stopImmediatePropagation?.();
    return;
  }

  if (targetInput) {
    targetInput.value = value;
  }

  if (trigger instanceof HTMLButtonElement || trigger instanceof HTMLInputElement) {
    trigger.value = value;
  }
}
