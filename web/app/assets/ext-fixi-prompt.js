document.addEventListener("fx:config", (event) => {
  const { cfg } = event.detail;
  const elt = event.target;

  // Case 1: ext-fx-prompt is on the submitter (button) of the form
  const submitter = cfg.trigger?.submitter;
  if (submitter && submitter.hasAttribute("ext-fx-prompt")) {
    const promptMsg = submitter.getAttribute("ext-fx-prompt");
    const name = submitter.getAttribute("name");
    const defaultMsg = submitter.value || "";
    if (name && promptMsg) {
      cfg.confirm = async () => {
        const value = window.prompt(promptMsg, defaultMsg);
        if (value == null) return false;
        submitter.value = value;
        cfg.body.set(name, value);
        return true;
      };
      return;
    }
  }

  // Case 2: ext-fx-prompt is on the element itself
  if (elt.hasAttribute("ext-fx-prompt")) {
    const promptMsg = elt.getAttribute("ext-fx-prompt");
    const name = elt.getAttribute("name");
    const defaultMsg = elt.value || "";
    if (name && promptMsg) {
      cfg.confirm = async () => {
        const value = window.prompt(promptMsg, defaultMsg);
        if (value == null) return false;
        elt.value = value;
        cfg.body.set(name, value);
        return true;
      };
      return;
    }
  }

  if (elt instanceof HTMLFormElement) {
    const promptInput = elt.querySelector("input[ext-fx-prompt]");
    if (!promptInput) return;
    const name = promptInput.getAttribute("name");
    const promptMsg = promptInput.getAttribute("ext-fx-prompt");
    const defaultMsg = promptInput.value;
    if (!name || !promptMsg) return;

    cfg.confirm = async () => {
      const value = window.prompt(promptMsg, defaultMsg || undefined);
      if (value == null) return false;
      promptInput.value = value;
      cfg.body.set(name, value);
      return true;
    };
    return;
  }
});
