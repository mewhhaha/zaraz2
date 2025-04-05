document.addEventListener("fx:config", (ev) => {
  if (
    ev.target instanceof HTMLElement &&
    ev.target.hasAttribute("ext-fx-allow-default")
  ) {
    console.log("ext-fx-allow-default", ev.detail.cfg);
    ev.detail.cfg.preventTrigger = false;
  }
});
