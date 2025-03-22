// fixi confirmation extension
document.addEventListener("fx:config", (evt) => {
  var promptMessage = evt.target.getAttribute("ext-fx-prompt");
  if (promptMessage) {
    evt.detail.cfg.confirm = () => {
      const result = prompt(promptMessage);
      if (result) {
        evt.target.value = result;
      }
      return result;
    };
  }
});
