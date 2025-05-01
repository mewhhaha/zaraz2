document.addEventListener("fx:after", (evt) => {
  if (evt.target.getAttribute("ext-fx-push")) {
    history.replaceState({ fixi: true, url: location.href }, "", location.href);
    history.pushState(
      { fixi: true, url: evt.detail.cfg.response.url },
      "",
      evt.detail.cfg.response.url,
    );
  }
});

window.addEventListener("popstate", async (evt) => {
  if (evt.state.fixi) {
    let historyResp = await fetch(evt.state.url);
    document.documentElement.innerHTML = await historyResp.text();
    document.dispatchEvent(new CustomEvent("fx:process"));
  }
});
