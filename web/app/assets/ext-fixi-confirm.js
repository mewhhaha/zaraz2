// fixi confirmation extension
document.addEventListener("fx:config", (evt) => {
  if (evt.target.getAttribute("ext-fx-confirm")) {
    const confirmationMessage = evt.target.getAttribute("ext-fx-confirm");
    if (confirmationMessage) {
      evt.detail.cfg.confirm = () => confirm(confirmationMessage);
    }
  }
});
