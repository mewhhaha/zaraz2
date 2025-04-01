
import * as document from "./document.tsx";
import { type route } from "@mewhhaha/fx-router";
import * as $auth__ from "./routes/auth.$/route.tsx";
import * as $auth_action from "./routes/auth.action/route.tsx";
import * as $auth_forgotten__id from "./routes/auth.forgotten.$id/route.tsx";
import * as $auth_forgotten__index from "./routes/auth.forgotten._index/route.tsx";
import * as $auth_register from "./routes/auth.register/route.tsx";
import * as $_index from "./routes/_index.tsx";
import * as $_root from "./routes/_root/route.tsx";
import * as $_root_home from "./routes/_root.home/route.tsx";
const $$auth_forgotten__index = { id: "auth.forgotten._index", mod: $auth_forgotten__index };
const $$auth_forgotten__id = { id: "auth.forgotten.$id", mod: $auth_forgotten__id, params: ["id"] };
const $$auth_action = { id: "auth.action", mod: $auth_action };
const $$auth_register = { id: "auth.register", mod: $auth_register };
const $$_root_home = { id: "_root.home", mod: $_root_home };
const $$auth__ = { id: "auth.$", mod: $auth__, params: [""] };
const $$_index = { id: "_index", mod: $_index };
const $$_root = { id: "_root", mod: $_root };
const $document = { id: "", mod: document };

export const routes: route[] = [[/^\/auth\/forgotten$/, [$document,$$auth_forgotten__index]],
[/^\/auth\/forgotten\/(?<id>[^/]+)$/, [$document,$$auth_forgotten__id]],
[/^\/auth\/action$/, [$document,$$auth_action]],
[/^\/auth\/register$/, [$document,$$auth_register]],
[/^\/home$/, [$document,$$_root,$$_root_home]],
[/^\/auth\/(?<>[^/]+)$/, [$document,$$auth__]],
[/^\/$/, [$document,$$_index]]];
