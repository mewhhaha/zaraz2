import type { FxAction } from "../../ext-fixi.d.ts";

const promptAction: FxAction = async (options) => {
  const name = options.name as string;
  const promptMessage = options.prompt as string;
  if (!name || !promptMessage) {
    return new Response("Missing name or prompt message", { status: 400 });
  }
  const result = prompt(promptMessage);
  if (result) {
    options.body.set(name, result);
    return new Response("Prompt value set", { status: 200 });
  }
  return new Response("Prompt cancelled", { status: 400 });
};

export default promptAction;
