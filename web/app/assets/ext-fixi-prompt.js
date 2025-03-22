// fixi confirmation extension
document.addEventListener("fx:config", (evt) => {
  let target;
  if (evt.target.hasAttribute("ext-fx-prompt")) {
    target = evt.target;
  } else {
    target = evt.target.querySelector("[ext-fx-prompt]");
  }

  if (
    !(evt.target instanceof HTMLFormElement) ||
    !target ||
    !target.getAttribute("name")
  ) {
    return;
  }

  const promptMessage = target.getAttribute("ext-fx-prompt");
  if (promptMessage) {
    evt.detail.cfg.confirm = () => {
      const result = prompt(promptMessage);
      if (result) {
        evt.detail.cfg.body.set(target.getAttribute("name"), result);
      }
      return !!result;
    };
  }
});
