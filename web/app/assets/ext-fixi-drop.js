document.addEventListener("fx:config", (ev) => {
  if (
    ev.target instanceof HTMLElement &&
    ev.target.hasAttribute("ext-fx-drop")
  ) {
    ev.detail.cfg.drop = true;
  }
  return false;
});
