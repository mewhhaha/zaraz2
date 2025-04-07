import { authenticate } from "@packages/passkey";

document.addEventListener("fx:config", async (evt) => {
  const challenge = evt.target.getAttribute("ext-fx-passkey-verify");
  if (!challenge) {
    return;
  }

  evt.detail.cfg.confirm = async () => {
    const token = await authenticate(challenge);
    if (!token) {
      return false;
    }

    evt.detail.cfg.body.set("token", token);
    return true;
  };
});
