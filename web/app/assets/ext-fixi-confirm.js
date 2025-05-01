document.addEventListener("fx:config", (event) => {
  const { cfg } = event.detail;
  const elt = event.target;

  const confirmMsg = elt.getAttribute("ext-fx-confirm");
  if (confirmMsg) {
    cfg.confirm = async () => {
      return window.confirm(confirmMsg);
    };
  }
});
