import confetti from "canvas-confetti";

let loaded = false;

document.addEventListener("fx:config", (evt) => {
  if (evt.target.hasAttribute("ext-fx-confetti")) {
    loaded = true;
  }
});

// fixi confirmation extension
document.addEventListener("fx:swapped", () => {
  if (loaded) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      disableForReducedMotion: true,
    });
    loaded = false;
  }
});
