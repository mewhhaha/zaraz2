/// <reference lib="dom" />

type ConfirmEvent = Event & {
  stopImmediatePropagation?: () => void;
};

export default function confirmHandler(ev: ConfirmEvent) {
  const target = ev.currentTarget;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const message = target.getAttribute("data-confirm");
  if (!message) {
    return;
  }

  if (!window.confirm(message)) {
    ev.preventDefault();
    ev.stopImmediatePropagation?.();
  }
}
