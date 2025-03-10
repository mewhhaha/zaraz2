
import * as document from "./document.tsx";
import { type route } from "@mewhhaha/fx-router";
import * as $_index from "./routes/_index.tsx";
import * as $_root_add from "./routes/_root.add.tsx";
import * as $_root_done from "./routes/_root.done.tsx";
import * as $_root_home from "./routes/_root.home.tsx";
import * as $_root from "./routes/_root.tsx";
const $$_root_add = { id: "_root.add", mod: $_root_add };
const $$_root_done = { id: "_root.done", mod: $_root_done };
const $$_root_home = { id: "_root.home", mod: $_root_home };
const $$_index = { id: "_index", mod: $_index };
const $$_root = { id: "_root", mod: $_root };
const $document = { id: "", mod: document };

export const routes: route[] = [[/^\/add$/, [$document,$$_root,$$_root_add]],
[/^\/done$/, [$document,$$_root,$$_root_done]],
[/^\/home$/, [$document,$$_root,$$_root_home]],
[/^\/$/, [$document,$$_index]]];
