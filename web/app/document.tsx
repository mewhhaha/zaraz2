import type { Route as t } from "./+types.document";
import type { headers as RuwuterHeaders, JSX } from "@mewhhaha/ruwuter";
import clientUrl from "@mewhhaha/ruwuter/client.js?url&no-inline";
import iconUrl from "./assets/favicon.ico?url&no-inline";
import cmdUrl from "./assets/cmd.js?url&no-inline";
import offlineUrl from "./assets/offline.js?url&no-inline";

const stylesUrl = import.meta.env.DEV
  ? "/app/assets/tailwind.css?direct"
  : "/assets/styles.css";

export const loader = ({ env }: t.LoaderArgs) => {
  return { nonce: env.nonce };
};

type DocumentLoaderData = Awaited<ReturnType<typeof loader>>;

export const headers: RuwuterHeaders = ({ loaderData }) => {
  const { nonce } = loaderData as DocumentLoaderData;
  const headers = new Headers();
  headers.set("Strict-Transport-Security", "max-age=31536000");

  if (nonce) {
    headers.set(
      "Content-Security-Policy",
      `
script-src 'strict-dynamic' 'nonce-${nonce}' 'unsafe-inline' http: https:;
style-src 'self' 'unsafe-inline';
connect-src 'self';
frame-ancestors 'none';
object-src 'none';
base-uri 'none';
worker-src 'self';
require-trusted-types-for 'script';
`.replace(/\n/g, " "),
    );
  }

  return headers;
};

export default function Document({
  children,
  loaderData: { nonce },
}: {
  children?: JSX.Element;
  loaderData: DocumentLoaderData;
}) {
  return (
    <html lang="en">
      <head>
        <title>zaraz-2</title>
        <meta charset="UTF-8"></meta>
        <link rel="icon" type="image/x-icon" href={iconUrl}></link>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content, viewport-fit=cover"
        ></meta>
        <link rel="stylesheet" href={stylesUrl} />
        <script nonce={nonce} src={cmdUrl} async></script>
        <script type="module" nonce={nonce} src={clientUrl} async></script>
        <script type="module" nonce={nonce} src={offlineUrl} async></script>
      </head>
      <body
        class={`
          bg-zinc-950 text-amber-50 antialiased transition-[filter]
          duration-300 inert:grayscale-100
        `}
      >
        {children}
      </body>
    </html>
  );
}
