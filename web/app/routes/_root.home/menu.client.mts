import type { FxAction } from "../../ext-fixi";
import confetti from "canvas-confetti";

const menuHandler: FxAction = async (options) => {
  if (options.body.get("intent") === "done") {
    document.addEventListener(
      "fx:swapped",
      () => {
        confetti.reset();
        confetti({
          particleCount: 100,
          spread: 180,
          origin: { y: -0.1 },
          startVelocity: -35,
          disableForReducedMotion: true,
        });
      },
      { once: true },
    );
  }

  document.addEventListener(
    "fx:swapped",
    () => {
      const transitions = document.querySelectorAll("[data-view-transition]");
      for (const transition of transitions) {
        transition.removeAttribute("data-view-transition");
      }
    },
    { once: true },
  );

  return fetch("/home", options);
};

export default menuHandler;
