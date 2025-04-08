document.addEventListener("fx:after", (event) => {
  const target = event.target.hasAttribute("ext-fx-reload");
  if (target) {
    document.startViewTransition(() => {
      window.location.reload();
    });
  }
});
