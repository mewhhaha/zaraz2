import type { FxAction } from "../../ext-fixi.d.ts";

const confirmAction: FxAction = async (options) => {
  const message = options.message as string;
  if (!message) {
    return new Response("Missing confirmation message", { status: 400 });
  }
  const confirmed = confirm(message);
  if (confirmed) {
    return new Response("Confirmed", { status: 200 });
  }
  return new Response("Not confirmed", { status: 400 });
};

export default confirmAction;
