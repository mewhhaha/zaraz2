import { register } from "@packages/passkey";

const challengeUri = "/auth/challenge";
const registerForm = document.querySelector("form");
const registerToken = registerForm?.querySelector("input[name=token]");
const registerUsername = registerForm?.querySelector("input[name=username]");

if (!(registerForm instanceof HTMLFormElement)) {
  throw new Error("Missing form");
}
if (!(registerUsername instanceof HTMLInputElement)) {
  throw new Error("Missing username input");
}
if (!(registerToken instanceof HTMLInputElement)) {
  throw new Error("Missing token input");
}

const valid = registerForm.reportValidity();
if (valid) {
  const token = await register(challengeUri, registerUsername.value);
  registerToken.value = token;
  registerForm.requestSubmit();
}
