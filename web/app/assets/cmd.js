(() => {
  // Prevent multiple initializations
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

    let commandHandled = false;

    // Handle built-in popover commands
    if (targetElement.hasAttribute("popover")) {
      try {
        if (command === "toggle-popover") {
          targetElement.togglePopover();
          commandHandled = true;
        } else if (command === "show-popover") {
          targetElement.showPopover();
          commandHandled = true;
        } else if (command === "hide-popover") {
          targetElement.hidePopover();
          commandHandled = true;
        }
      } catch (e) {
        console.error(
          `[cmd polyfill] Error executing popover command '${command}' on #${targetId}:`,
          e,
        );
        // Allow fallback to custom event dispatch
      }
    }

    // Handle built-in dialog commands
    if (!commandHandled && targetElement.tagName === "DIALOG") {
      try {
        if (command === "show-modal") {
          targetElement.showModal();
          commandHandled = true;
        } else if (command === "close") {
          targetElement.close();
          commandHandled = true;
        }
      } catch (e) {
        console.error(
          `[cmd polyfill] Error executing dialog command '${command}' on #${targetId}:`,
          e,
        );
      }
    }

    // Dispatch custom command event if not handled by built-ins
    if (!commandHandled) {
      // Use CustomEvent as CommandEvent might not be available
      const commandEvent = new CustomEvent("command", {
        bubbles: true, // Commands should bubble
        cancelable: false, // Standard command event isn't cancelable
        detail: { command: command }, // Include command in detail for easy access
      });
      targetElement.dispatchEvent(commandEvent);
      // console.log(`[cmd polyfill] Dispatched command '${command}' to #${targetId}`);
    }
  }

  function click(event) {
    // Ensure it's the button itself, not a child element
    if (event.target.closest("button[commandfor]") === this) {
      invoke(this);
    }
  }

  function keydown(event) {
    if (event.key === " " || event.key === "Enter") {
      // Prevent default behavior like scrolling page on space
      event.preventDefault();
      invoke(this);
    }
  }

  function init(button) {
    // Check if already initialized
    if (button.__cmd_polyfilled_inited) return;

    // Add listeners
    button.addEventListener("click", click);
    button.addEventListener("keydown", keydown);

    button.__cmd_polyfilled_inited = true;
    // console.log('[cmd polyfill] Initialized button:', button);
  }

  function process(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // Check the node itself
      if (node.matches("button[commandfor]")) {
        init(node);
      }
      // Check descendants
      node.querySelectorAll("button[commandfor]").forEach(init);
    }
  }

  // --- Initialization ---

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
    // console.log('[cmd polyfill] Observer started.');
  });
})();
