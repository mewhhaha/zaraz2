
import * as document from "./document.tsx";
import { type route } from "@mewhhaha/fx-router";
import * as $auth_challenge from "./routes/auth.challenge/route.tsx";
import * as $auth_forgotten__id from "./routes/auth.forgotten.$id/route.tsx";
import * as $auth_refresh from "./routes/auth.refresh/route.tsx";
import * as $auth_register from "./routes/auth.register/route.tsx";
import * as $auth_verify from "./routes/auth.verify/route.tsx";
import * as $_index from "./routes/_index.tsx";
import * as $_root from "./routes/_root/route.tsx";
import * as $_root_home from "./routes/_root.home/route.tsx";
const $$auth_forgotten__id = { id: "auth.forgotten.$id", mod: $auth_forgotten__id, params: ["id"] };
const $$auth_challenge = { id: "auth.challenge", mod: $auth_challenge };
const $$auth_refresh = { id: "auth.refresh", mod: $auth_refresh };
const $$auth_register = { id: "auth.register", mod: $auth_register };
const $$auth_verify = { id: "auth.verify", mod: $auth_verify };
const $$_root_home = { id: "_root.home", mod: $_root_home };
const $$_index = { id: "_index", mod: $_index };
const $$_root = { id: "_root", mod: $_root };
const $document = { id: "", mod: document };

export const routes: route[] = [[/^\/auth\/forgotten\/(?<id>[^/]+)$/, [$document,$$auth_forgotten__id]],
[/^\/auth\/challenge$/, [$document,$$auth_challenge]],
[/^\/auth\/refresh$/, [$document,$$auth_refresh]],
[/^\/auth\/register$/, [$document,$$auth_register]],
[/^\/auth\/verify$/, [$document,$$auth_verify]],
[/^\/home$/, [$document,$$_root,$$_root_home]],
[/^\/$/, [$document,$$_index]]];
