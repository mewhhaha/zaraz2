import type { Route as t } from "./+types.document";
import clientUrl from "@mewhhaha/ruwuter/client.js?url&no-inline";
import resolveUrl from "@mewhhaha/ruwuter/resolve.js?url&no-inline";
import fixiUrl from "./assets/fixi.js?url&no-inline";
import fixiExtUrl from "./assets/ext-fixi.js?url&no-inline";
import stylesUrl from "./assets/tailwind.css?url&no-inline";
import iconUrl from "./assets/favicon.ico?url&no-inline";
import cmdUrl from "./assets/cmd.js?url&no-inline";

export const loader = ({ context: [env] }: t.LoaderArgs) => {
  return { nonce: env.nonce };
};

export const headers: t.HeadersFunction = ({ loaderData, context: [env] }) => {
  const { nonce } = loaderData;
  const headers = new Headers();
  headers.set("Strict-Transport-Security", "max-age=31536000");

  if (nonce) {
    headers.set(
      "Content-Security-Policy",
      `
script-src 'strict-dynamic' 'nonce-${env.nonce}' 'unsafe-inline' http: https:;
object-src 'none';
base-uri 'none';
require-trusted-types-for 'script';
`.replace(/\n/g, " "),
    );
  }

  return headers;
};

export default function Document({
  children,
  loaderData: { nonce },
}: t.ComponentProps) {
  return (
    <html lang="en">
      <head>
        <title>zaraz-2</title>
        <meta charset="UTF-8"></meta>
        <link rel="icon" type="image/svg" href={iconUrl}></link>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content"
        ></meta>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossorigin=""
        />
        <link rel="stylesheet" href={stylesUrl} />
        <script nonce={nonce} src={fixiUrl} defer></script>
        <script nonce={nonce} src={fixiExtUrl} defer></script>
        <script nonce={nonce} src={cmdUrl} defer></script>
        <script nonce={nonce} src={clientUrl} defer></script>
        <script nonce={nonce} src={resolveUrl} defer></script>
      </head>
      <body
        class={`
          bg-slate-950 text-amber-50 transition-[filter] duration-300

          inert:grayscale-100
        `}
      >
        {children}
      </body>
    </html>
  );
}
