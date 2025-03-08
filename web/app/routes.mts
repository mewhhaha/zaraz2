
import * as document from "./document.tsx";
import { type route } from "@mewhhaha/fx-router";
import * as $_index from "./routes/_index.tsx";
import * as $_root_done from "./routes/_root.done.tsx";
import * as $_root_home from "./routes/_root.home.tsx";
import * as $_root_tasks from "./routes/_root.tasks.tsx";
import * as $_root from "./routes/_root.tsx";
const $$_root_done = { id: "_root.done", mod: $_root_done };
const $$_root_home = { id: "_root.home", mod: $_root_home };
const $$_root_tasks = { id: "_root.tasks", mod: $_root_tasks };
const $$_index = { id: "_index", mod: $_index };
const $$_root = { id: "_root", mod: $_root };
const $document = { id: "", mod: document };

export const routes: route[] = [[/^done$/, [$document,$$_root,$$_root_done]],
[/^home$/, [$document,$$_root,$$_root_home]],
[/^tasks$/, [$document,$$_root,$$_root_tasks]],
[/^$/, [$document,$$_index]]];
