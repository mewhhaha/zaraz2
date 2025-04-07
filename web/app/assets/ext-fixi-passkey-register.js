import { authenticate, register } from "@packages/passkey";

document.addEventListener("fx:config", async (evt) => {
  const challenge = evt.target.getAttribute("ext-fx-passkey-register");
  if (!challenge) {
    return;
  }

  evt.detail.cfg.confirm = async () => {
    const username = evt.target.querySelector("[name=username]")?.value;
    if (!username) {
      throw new Error("Input 'username' is required");
    }

    const token = await register(challenge, username);
    if (!token) {
      return false;
    }

    evt.detail.cfg.body.set("token", token);
    return true;
  };
});
