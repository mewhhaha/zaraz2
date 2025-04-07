document.addEventListener("fx:config", (ev) => {
  if (
    ev.target instanceof HTMLElement &&
    ev.target.hasAttribute("ext-fx-allow-default")
  ) {
    ev.detail.cfg.preventTrigger = false;
  }
});
