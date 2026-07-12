import type { Controller, ControllerContext } from "@mewhhaha/ruwuter/browser";

type ControllerModule = {
  default?: unknown;
};

const controllerModules = import.meta.glob<ControllerModule>(
  "./**/*.client.ts",
  { eager: true },
);

export default function activateController(
  context: ControllerContext,
): ReturnType<Controller> {
  const encodedModuleId = context.root.getAttribute("data-rw-controller-id");
  if (!encodedModuleId) {
    throw new TypeError("Ruwuter controller root is missing its module id.");
  }

  const moduleId = decodeURIComponent(encodedModuleId);
  const controllerModule = controllerModules[`./${moduleId}`];
  if (!controllerModule || typeof controllerModule.default !== "function") {
    throw new TypeError(`Ruwuter controller module was not found: ${moduleId}`);
  }

  return (controllerModule.default as Controller)(context);
}
