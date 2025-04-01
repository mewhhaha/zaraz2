import { save } from "./challenge";
import { authenticate } from "../helpers.mts";
import type { EnvAuth } from "../env";
import { createResend } from "../resend";

export default async function ({
  request,
  context: [env, ctx],
}: {
  request: Request;
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const cookie = await authenticate(request, env.SECRET);

  const { email } = await parseFormData(request);

  const sendEmail = async () => {
    const id = crypto.randomUUID();
    await save("email", request, id, { email, userId: cookie.userId });

    const directory = request.url.endsWith("/")
      ? request.url
      : request.url + "/";

    const href = new URL(encodeURIComponent(id), directory).href;
    try {
      const resend = createResend(env.RESEND_API_KEY);
      await resend.send({
        from: "support@zaraz2.app",
        to: [email],
        subject: "Verify your email",
        html: `<a href="${href}">${href}</a>`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  ctx.waitUntil(sendEmail());

  return new Response(null, { status: 204 });
}

const parseFormData = async (request: Request) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  if (!email) {
    throw new Response("email_missing", { status: 403 });
  }
  return { email };
};
