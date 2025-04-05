document.addEventListener("fx:config", (event) => {
  const target = event.target.getAttribute("ext-fx-transition");
  if (target) {
    const el = document.querySelector(target);
    event.detail.cfg.transition = el.startViewTransition?.bind(el);
  }
});
