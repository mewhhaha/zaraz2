
import * as document from "./document.tsx";
import { type route } from "@mewhhaha/fx-router";
import * as $auth__ from "./routes/auth.$/route.tsx";
import * as $auth__index from "./routes/auth._index/route.tsx";
import * as $_index from "./routes/_index.tsx";
import * as $_root from "./routes/_root/route.tsx";
import * as $_root_home from "./routes/_root.home/route.tsx";
const $$auth__index = { id: "auth._index", mod: $auth__index };
const $$_root_home = { id: "_root.home", mod: $_root_home };
const $$auth__ = { id: "auth.$", mod: $auth__, params: [""] };
const $$_index = { id: "_index", mod: $_index };
const $$_root = { id: "_root", mod: $_root };
const $document = { id: "", mod: document };

export const routes: route[] = [[new URLPattern({ pathname: "/auth" }), [$document,$$auth__index]],
[new URLPattern({ pathname: "/home" }), [$document,$$_root,$$_root_home]],
[new URLPattern({ pathname: "/auth/*" }), [$document,$$auth__]],
[new URLPattern({ pathname: "/" }), [$document,$$_index]]];
