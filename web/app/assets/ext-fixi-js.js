document.addEventListener("fx:config", (evt) => {
  const { cfg } = evt.detail;
  if (typeof cfg.action === "string" && /\.(m?js)$/.test(cfg.action)) {
    cfg.fetch = async (action, options) => {
      const mod = await import(action);
      return await mod.default(options);
    };
  }
});

document.addEventListener("fx:init", async (evt) => {
  const elt = evt.target;
  const init = elt.getAttribute("fx-init");
  if (typeof init === "string" && /\.(m?js)$/.test(init)) {
    const mod = await import(init);
    mod.default(elt);
  }
});
