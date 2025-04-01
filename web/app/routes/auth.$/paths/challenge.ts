import { hmac } from "../helpers.mts";
import type { EnvAuth } from "../env";

export default async function ({
  request,
  context: [env, ctx],
}: {
  request: Request;
  context: readonly [env: EnvAuth, ctx: ExecutionContext];
}) {
  const id = challenge();

  const token = `${id}.${btoa(await hmac(env.SECRET, id))}`;

  ctx.waitUntil(save("challenge", request, id));

  return new Response(token, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

const challenge = () => {
  return btoa(crypto.randomUUID());
};

type CacheBody = {
  recover: { userId: string };
  email: { userId: string; email: string };
  challenge?: undefined;
};

export const save = async <T extends keyof CacheBody>(
  cache: T,
  request: Request,
  id: string,
  ...[body]: CacheBody[T] extends undefined ? [] : [body: CacheBody[T]]
) => {
  const openedCache = await caches.open(cache);
  const url = new URL(`/${id}`, new URL(request.url).origin);
  const key = new Request(url, {
    headers: { "Cache-Control": "max-age=3600" },
  });
  const value = new Response(body && JSON.stringify(body));
  await openedCache.put(key, value);
};

export const finish = async <T extends keyof CacheBody>(
  cache: T,
  request: Request,
  id: string,
) => {
  const url = new URL(`/${id}`, new URL(request.url).origin);
  const key = new Request(url);
  const openedCache = await caches.open(cache);
  const response = await openedCache.match(key);

  if (!response) {
    return "missing_challenge" as const;
  }

  await openedCache.delete(key);

  const text = await response.text();

  return {
    body: (text ? JSON.parse(text) : undefined) as CacheBody[T],
  } as const;
};
