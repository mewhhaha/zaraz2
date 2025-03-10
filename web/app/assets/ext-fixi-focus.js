let focus = null;

document.addEventListener("fx:after", (event) => {
  const target = event.target.getAttribute("ext-fx-focus");
  if (target) {
    focus = target;
  }
});

document.addEventListener("fx:swapped", (event) => {
  if (focus) {
    document.querySelector(focus).focus();
    focus = null;
  }
});
