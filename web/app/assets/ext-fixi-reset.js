document.addEventListener("fx:after", (event) => {
  if (
    event.target.hasAttribute("ext-fx-reset") &&
    event.target instanceof HTMLFormElement
  ) {
    event.target.reset();
  }
});
