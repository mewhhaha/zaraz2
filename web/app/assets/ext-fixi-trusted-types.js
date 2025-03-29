let policy;
if (window.trustedTypes && trustedTypes.createPolicy) {
  policy = trustedTypes.createPolicy("fx", {
    createHTML: (s) => s,
  });
}

document.addEventListener("fx:after", (event) => {
  if (policy) {
    event.detail.cfg.text = policy.createHTML(event.detail.cfg.text);
  }
});
