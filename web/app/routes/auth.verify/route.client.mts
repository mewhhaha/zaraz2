import { authenticate } from "@packages/passkey";

const challengeUri = "/auth/challenge";

const token = await authenticate(challengeUri);
const formData = new FormData();
formData.set("token", token);
const response = await fetch("/auth/verify", {
  method: "POST",
  body: formData,
});

if (response.ok) {
  window.location.href = "/home";
}
