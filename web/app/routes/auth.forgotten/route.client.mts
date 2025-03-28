import { authenticate } from "@packages/passkey";

const challengeUri = "/auth/challenge";

const form = document.querySelector("form");
if (!(form instanceof HTMLFormElement)) {
  throw new Error("Missing form");
}

const usernameInput = form.querySelector("input[name=username]");
if (!(usernameInput instanceof HTMLInputElement)) {
  throw new Error("Missing username input");
}

const username = window.prompt("Enter your username");
if (!username) {
  throw new Error("Missing username");
}

usernameInput.value = username;
form.requestSubmit();
