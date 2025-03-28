import { register } from "@packages/passkey";

const challengeUri = "/auth/challenge";
const registerForm = document.getElementById("register-form");
const registerToken = registerForm?.querySelector("input[name=token]");
const registerUsername = registerForm?.querySelector("input[name=username]");
const button = registerForm?.querySelector("button");

if (!(registerForm instanceof HTMLFormElement)) {
  throw new Error('Missing form with id "register-form"');
}
if (!(registerUsername instanceof HTMLInputElement)) {
  throw new Error("Missing username input");
}
if (!(registerToken instanceof HTMLInputElement)) {
  throw new Error("Missing token input");
}
if (!(button instanceof HTMLButtonElement)) {
  throw new Error("Missing button");
}

button.addEventListener("click", async (event) => {
  event.preventDefault();
  const valid = registerForm.reportValidity();
  if (valid) {
    const token = await register(challengeUri, registerUsername.value);
    registerToken.value = token;
    registerForm.requestSubmit();
  }
});
