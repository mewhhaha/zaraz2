/// <reference lib="dom" />

type PromptEvent = Event & {
  stopImmediatePropagation?: () => void;
};

export default function promptHandler(
  this: { title: string; name: string; target: string },
  ev: PromptEvent,
) {
  const trigger = ev.currentTarget;
  if (!(trigger instanceof HTMLElement)) {
    return;
  }

  const form = trigger.closest("form");
  const input = form?.querySelector(this.target);
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  const value = window.prompt(this.title);
  if (!value) {
    return;
  }

  input.value = value;
  form?.requestSubmit();
}
