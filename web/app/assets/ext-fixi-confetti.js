import confetti from "canvas-confetti";

// fixi confetti extension
document.addEventListener("fx:swapped", () => {
  const elements = document.querySelectorAll("[ext-fx-confetti]");
  for (const element of elements) {
    element.removeAttribute("ext-fx-confetti");
  }

  if (elements.length > 0) {
    confetti.reset();
    confetti({
      particleCount: 100,
      spread: 180,
      origin: { y: -0.1 },
      startVelocity: -35,
      disableForReducedMotion: true,
    });
  }
});
