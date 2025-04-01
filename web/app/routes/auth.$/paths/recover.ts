import { save } from "./challenge";
import { createResend } from "../resend";
import type { EnvAuth } from "../env";

const parseFormData = async (request: Request) => {
  const formData = await request.formData();
  const username = formData.get("username")?.toString();
  if (!username) {
    throw new Response("username_missing", { status: 403 });
  }
  return { username };
};

export default async function ({
  request,
  context: [env, ctx],
}: {
  request: Request;
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const { username } = await parseFormData(request);

  const sendEmail = async () => {
    const user = env.USER.get(env.USER.idFromName(username));

    const data = await user.recover();
    if (data === "no_recovery_email") {
      throw new Response(data, { status: 501 });
    }

    if (data === "too_many_attempts") {
      throw new Response(data, { status: 429 });
    }

    const id = crypto.randomUUID();
    await save("recover", request, id, { userId: user.id.toString() });

    const directory = request.url.endsWith("/")
      ? request.url
      : request.url + "/";

    const href = new URL(encodeURIComponent(id), directory).href;

    try {
      const resend = createResend(env.RESEND_API_KEY);
      await resend.send({
        from: "support@zaraz2.app",
        to: [data.email],
        subject: "Recover your account",
        html: `<a href="${href}">${href}</a>`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  ctx.waitUntil(sendEmail());
}
