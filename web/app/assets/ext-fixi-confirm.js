// fixi confirmation extension
document.addEventListener("fx:config", (evt) => {
  var confirmationMessage = evt.target.getAttribute("ext-fx-confirm");
  if (confirmationMessage) {
    evt.detail.cfg.confirm = () => confirm(confirmationMessage);
  }
});
