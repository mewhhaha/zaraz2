import { DurableObject } from "cloudflare:workers";

/**
 * Function that automatically stores the value of a property in the storage of the Durable Object
 */
export function store<Return extends Promise<unknown>>(
  { set }: ClassAccessorDecoratorTarget<DurableObject, Return>,
  context: ClassAccessorDecoratorContext<DurableObject, Return>,
): ClassAccessorDecoratorResult<DurableObject, Return> {
  return {
    set(value: Return) {
      set.call(this, value);
      value.then((v) => {
        void this.ctx.storage.put(context.name.toString(), v);
      });
    },
  };
}
