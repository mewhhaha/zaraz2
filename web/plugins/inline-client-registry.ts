export const INLINE_ID_PREFIX = "\0inline-client:";
export const INLINE_SPECIFIER_PREFIX = "./__inline_client__/";

const modules = new Map<string, string>();

export function setInlineClientModule(id: string, code: string) {
  modules.set(id, code);
}

export function getInlineClientModule(id: string): string | undefined {
  return modules.get(id);
}

export function deleteInlineClientModule(id: string) {
  modules.delete(id);
}

export function clearInlineClientModules() {
  modules.clear();
}

export function hasInlineClientModule(id: string) {
  return modules.has(id);
}
