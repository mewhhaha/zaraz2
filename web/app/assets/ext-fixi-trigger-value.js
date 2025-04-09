document.addEventListener("fx:config", (ev) => {
  const value = ev.target.getAttribute("ext-fx-trigger-value");
  if (!value) return;

  if (ev.detail.cfg.trigger[value]) {
    ev.detail.cfg.body.set(value, ev.detail.cfg.trigger[value]);
  }
});
