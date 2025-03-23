// fixi confirmation extension
document.addEventListener("fx:config", (evt) => {
  if (!(evt.target instanceof HTMLFormElement)) {
    return;
  }
  let target;
  if (evt.target.hasAttribute("ext-fx-prompt")) {
    target = evt.target;
  } else {
    target = evt.target.querySelector("[ext-fx-prompt]");
  }

  if (target !== evt.detail.cfg.trigger.submitter) {
    return;
  }

  if (!target || !target.getAttribute("name")) {
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
