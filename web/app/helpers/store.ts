const MISS = Symbol("durable-store-miss");

type Loaders<Schema extends Record<string, unknown>> = {
  [Key in keyof Schema]: () => Promise<Schema[Key] | undefined>;
};

export class DurableStore<Schema extends Record<string, unknown>> {
  private cache = new Map<keyof Schema, Schema[keyof Schema] | typeof MISS>();

  constructor(
    private readonly storage: DurableObjectState["storage"],
    private readonly loaders: Loaders<Schema>,
  ) {}

  async get<Key extends keyof Schema>(key: Key) {
    if (!this.cache.has(key)) {
      const loader = this.loaders[key];
      if (!loader) throw new Error(`No loader for ${String(key)}`);
      const value = await loader();
      if (value === undefined) {
        this.cache.set(key, MISS);
        throw new Error(`Durable store key ${String(key)} not loaded`);
      }
      this.cache.set(key, value as Schema[keyof Schema]);
    }

    const cached = this.cache.get(key);
    if (cached === MISS || cached === undefined) {
      throw new Error(`Durable store key ${String(key)} not loaded`);
    }
    return cached as Schema[Key];
  }

  async set<Key extends keyof Schema>(key: Key, value: Schema[Key]) {
    this.cache.set(key, value as Schema[keyof Schema]);
    await this.storage.put(String(key), value);
  }

  async delete<Key extends keyof Schema>(key: Key) {
    this.cache.set(key, MISS);
    await this.storage.delete(String(key));
  }
}

export const createStore = <Schema extends Record<string, unknown>>(
  storage: DurableObjectState["storage"],
  loaders: Loaders<Schema>,
) => new DurableStore(storage, loaders);
