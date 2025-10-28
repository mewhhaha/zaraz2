(function attachSwapToWindow(global) {
  if (global.swap) return;

  function resolveElement(ref) {
    if (!ref) {
      throw new TypeError("swap: target is required.");
    }
    if (ref instanceof Element) return ref;
    if (typeof ref === "string") {
      const element = document.querySelector(ref);
      if (!element) {
        throw new Error(`swap: no element matches selector "${ref}".`);
      }
      return element;
    }
    if (
      typeof ref === "object" &&
      "current" in ref &&
      ref.current instanceof Element
    ) {
      return ref.current;
    }
    throw new TypeError("swap: unsupported element reference provided.");
  }

  async function resolveText(input, provided) {
    if (provided !== undefined) return provided;
    if (typeof input === "string") return input;
    if (input instanceof Response) return await input.text();
    if (input && typeof input.text === "function") return await input.text();
    return String(input ?? "");
  }

  function applySwap(target, swapMode, text) {
    if (typeof swapMode === "function") {
      swapMode({ target, text });
      return;
    }
    if (/(before|after)(begin|end)/.test(swapMode)) {
      target.insertAdjacentHTML(swapMode, text);
      return;
    }
    if (swapMode in target) {
      target[swapMode] = text;
      return;
    }
    throw new Error(`swap: unsupported swap mode "${swapMode}".`);
  }

  async function swap(input, options = {}) {
    const target = resolveElement(options.target);
    const swapMode = options.swap ?? "innerHTML";

    let response = null;
    let text;

    if (options.text !== undefined) {
      text = options.text;
    } else if (input instanceof Response) {
      response = input;
      text = await response.text();
    } else if (
      typeof input === "string" ||
      input instanceof Request ||
      (input && typeof input.url === "string")
    ) {
      response = await fetch(input, options.init);
      text = await response.text();
    } else {
      text = await resolveText(input);
    }

    applySwap(target, swapMode, text);
    return { target, swap: swapMode, text, response };
  }

  global.swap = swap;
})(window);
