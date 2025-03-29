document.addEventListener("fx:init", (evt) => {
  if (evt.target.matches("[ext-fx-indicator]")) {
    var disableSelector = evt.target.getAttribute("ext-fx-indicator");
    evt.target.addEventListener("fx:before", () => {
      let disableTarget =
        disableSelector == ""
          ? evt.target
          : document.querySelector(disableSelector);
      disableTarget.setAttribute("data-indicator", "");
      evt.target.addEventListener("fx:after", (afterEvt) => {
        if (afterEvt.target == evt.target) {
          disableTarget.removeAttribute("data-indicator");
        }
      });
    });
  }
});
