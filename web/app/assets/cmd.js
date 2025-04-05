(() => {
  class CommandEvent extends Event {
    constructor(command) {
      super("command", { bubbles: true });
      this.command = command;
    }
  }

  // 1. Feature Detection: Check if native support exists
  if (
    HTMLButtonElement.prototype.hasOwnProperty("command") &&
    HTMLButtonElement.prototype.hasOwnProperty("commandForElement")
  ) {
    return; // Native support detected, no need for polyfill
  }

  // 2. Prevent multiple initializations of the polyfill
  if (document.__cmd_polyfilled) return;
  document.__cmd_polyfilled = true;

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(process);
      }
      // Optional: Handle attribute changes if commandfor/command might be added later
      // if (mutation.type === "attributes" && mutation.attributeName === "commandfor") {
      //   initButton(mutation.target);
      // }
    }
  });

  // --- Core Logic ---

  function invoke(button) {
    const targetId = button.getAttribute("commandfor");
    const command = button.getAttribute("command");
    if (!targetId || !command) return;

    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      console.warn(
        `[cmd polyfill] Target element with ID '${targetId}' not found for button command '${command}'.`,
      );
      return;
    }

    let handled = false;

    // Built-in commands (check for popover/dialog methods for safety)
    if (
      targetElement.hasAttribute("popover") &&
      typeof targetElement.togglePopover === "function"
    ) {
      if (command === "toggle-popover") {
        targetElement.togglePopover();
        handled = true;
      } else if (command === "show-popover") {
        targetElement.showPopover();
        handled = true;
      } else if (command === "hide-popover") {
        targetElement.hidePopover();
        handled = true;
      }
    }
    if (
      !handled &&
      targetElement.tagName === "DIALOG" &&
      typeof targetElement.showModal === "function"
    ) {
      if (command === "show-modal") {
        targetElement.showModal();
        handled = true;
      } else if (command === "close") {
        targetElement.close();
        handled = true;
      }
    }
  }

  /**
   *
   * @param {Event} event
   * @returns
   */
  function click(event) {
    if (event.defaultPrevented) return;
    if (event.target.closest("button[commandfor]") === this) {
      const commandEvent = new CommandEvent(command);
      targetElement.dispatchEvent(commandEvent, { bubbles: true });
    }
  }

  function command(event) {
    if (event.defaultPrevented) return;
    if (event.target.closest("button[commandfor]") === this) {
      invoke(this);
    }
  }

  function init(button) {
    if (button.__cmd_polyfilled_inited) return;
    button.addEventListener("click", click);
    button.addEventListener("command", command);
    button.__cmd_polyfilled_inited = true;
  }

  function process(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.matches("button[commandfor]")) init(node);
      node.querySelectorAll("button[commandfor]").forEach(init);
    }
  }

  // --- Initialization ---

  document.addEventListener("fx:process", (evt) => process(evt.target));
  // Wait for the DOM to be ready
  document.addEventListener("DOMContentLoaded", () => {
    // Process initial elements in the body
    process(document.body);

    // Start observing for future changes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      // attributes: true, // Uncomment if needed
      // attributeFilter: ['commandfor'] // Uncomment if needed
    });
  });
})();
