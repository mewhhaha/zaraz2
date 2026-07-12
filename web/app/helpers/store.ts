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

  async tryGet<Key extends keyof Schema>(
    key: Key,
  ): Promise<Schema[Key] | undefined> {
    if (!this.cache.has(key)) {
      const loader = this.loaders[key];
      if (!loader) throw new Error(`No loader for ${String(key)}`);
      const value = await loader();
      this.cache.set(key, value === undefined ? MISS : value);
    }

    const cached = this.cache.get(key);
    if (cached === MISS || cached === undefined) {
      return undefined;
    }
    return cached as Schema[Key];
  }

  async get<Key extends keyof Schema>(key: Key): Promise<Schema[Key]> {
    const value = await this.tryGet(key);
    if (value === undefined) {
      throw new Error(`Durable store key ${String(key)} not loaded`);
    }
    return value;
  }

  async has<Key extends keyof Schema>(key: Key): Promise<boolean> {
    return (await this.tryGet(key)) !== undefined;
  }

  async set<Key extends keyof Schema>(key: Key, value: Schema[Key]) {
    this.cache.set(key, value as Schema[keyof Schema]);
    await this.storage.put(String(key), value);
  }

  async delete<Key extends keyof Schema>(key: Key) {
    this.cache.set(key, MISS);
    await this.storage.delete(String(key));
  }

  /** Drop every cached value, e.g. after `storage.deleteAll()`. */
  clear() {
    this.cache.clear();
  }
}

export const createStore = <Schema extends Record<string, unknown>>(
  storage: DurableObjectState["storage"],
  loaders: Loaders<Schema>,
) => new DurableStore(storage, loaders);
