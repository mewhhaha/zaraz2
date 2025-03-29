document.addEventListener("fx:init", (ev) => {
  if (!(ev.target instanceof HTMLElement)) {
    return;
  }

  if (ev.target.id !== "menu-button") {
    return;
  }

  ev.target.addEventListener("fx:config", (ev) => {
    if (ev instanceof CustomEvent) {
      ev.detail.cfg.preventTrigger = false;
    }
  });

  ev.target.addEventListener("click", () => {
    console.log("clicked");
    const url = new URL(window.location.href);
    if (url.searchParams.has("open")) {
      url.searchParams.delete("open");
    } else {
      url.searchParams.set("open", "");
    }
    window.history.replaceState(null, "", url.pathname + url.search);
  });
});
