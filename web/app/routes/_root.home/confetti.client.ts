import confetti from "canvas-confetti";
import type { FxAction } from "../../ext-fixi.d.ts";

const confettiAction: FxAction = async (options) => {
  confetti.reset();
  confetti({
    particleCount: 100,
    spread: 180,
    origin: { y: -0.1 },
    startVelocity: -35,
    disableForReducedMotion: true,
  });
  return new Response("Confetti triggered", { status: 200 });
};

export default confettiAction;
