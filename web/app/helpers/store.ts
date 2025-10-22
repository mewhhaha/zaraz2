const ABSENT = Symbol("durable-store-absent");

type LoaderMap<Schema extends Record<string, unknown>> = {
  [Key in keyof Schema]: () => Promise<Schema[Key] | undefined>;
};

export class DurableStore<Schema extends Record<string, unknown>> {
  private cache = new Map<
    keyof Schema,
    Promise<Schema[keyof Schema] | typeof ABSENT>
  >();

  constructor(
    private readonly storage: DurableObjectState["storage"],
    private readonly loaders: LoaderMap<Schema>,
  ) {}

  async has<Key extends keyof Schema>(key: Key): Promise<boolean> {
    const value = await this.resolve(key);
    return value !== ABSENT;
  }

  async get<Key extends keyof Schema>(key: Key): Promise<Schema[Key]> {
    const value = await this.resolve(key);
    if (value === ABSENT) {
      throw new Error(`Durable store key "${String(key)}" is not loaded`);
    }
    return value as Schema[Key];
  }

  async maybe<Key extends keyof Schema>(
    key: Key,
  ): Promise<Schema[Key] | undefined> {
    const value = await this.resolve(key);
    if (value === ABSENT) {
      return undefined;
    }
    return value as Schema[Key];
  }

  set<Key extends keyof Schema>(key: Key, value: Schema[Key]) {
    this.cache.set(key, Promise.resolve(value));
    void this.storage.put(String(key), value);
  }

  delete<Key extends keyof Schema>(key: Key) {
    this.cache.set(key, Promise.resolve(ABSENT));
    void this.storage.delete(String(key));
  }

  private resolve<Key extends keyof Schema>(
    key: Key,
  ): Promise<Schema[Key] | typeof ABSENT> {
    let cached = this.cache.get(key);
    if (cached === undefined) {
      const loader = this.loaders[key];
      if (loader === undefined) {
        throw new Error(`Durable store missing loader for "${String(key)}"`);
      }
      cached = loader()
        .then((value) =>
          value === undefined ? ABSENT : (value as Schema[Key]),
        )
        .catch(() => ABSENT as Schema[Key] | typeof ABSENT);
      this.cache.set(
        key,
        cached as Promise<Schema[keyof Schema] | typeof ABSENT>,
      );
    }
    return cached as Promise<Schema[Key] | typeof ABSENT>;
  }
}

export const createStore = <Schema extends Record<string, unknown>>(
  storage: DurableObjectState["storage"],
  loaders: LoaderMap<Schema>,
) => new DurableStore<Schema>(storage, loaders);
