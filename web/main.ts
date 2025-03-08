import { routes } from "./app/routes.mjs";
import { Router, type Env } from "@mewhhaha/fx-router";

const router = Router(routes);

const handler: ExportedHandler<Env> = {
  fetch: router.handle,
};

export default handler;
