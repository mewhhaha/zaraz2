document.addEventListener("fx:init", (ev) => {
  if (!(ev.target instanceof HTMLElement)) {
    return;
  }

  const el = ev.target;

  if (el.id !== "menu-button") {
    return;
  }

  el.addEventListener("fx:config", (ev) => {
    if (ev instanceof CustomEvent) {
      ev.detail.cfg.preventTrigger = false;
    }
  });

  el.addEventListener("click", () => {
    const input = document.querySelector("input[name='open']");
    if (input instanceof HTMLInputElement) {
      input.value = input.value === "true" ? "" : "true";
    }
  });
});
