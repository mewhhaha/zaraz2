import { authenticate, register } from "@packages/passkey";

document.addEventListener("fx:config", async (evt) => {
  if (!(evt.target instanceof HTMLFormElement)) {
    return;
  }

  const element = evt.target.querySelector("[ext-fx-passkey-register]");
  if (!element) {
    return;
  }

  const challenge = element.getAttribute("ext-fx-passkey-register");
  if (!challenge) {
    return;
  }

  const f = async () => {
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

  if (evt.detail.cfg.confirm) {
    const g = evt.detail.cfg.confirm;
    evt.detail.cfg.confirm = async () => {
      const r = await g();
      if (!r) {
        return false;
      }

      return f();
    };
  } else {
    evt.detail.cfg.confirm = f;
  }
});
