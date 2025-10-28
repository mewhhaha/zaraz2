import type { Route as t } from "./+types.document";

const clientUrl = new URL("@mewhhaha/ruwuter/client.js", import.meta.url)
  .pathname;
const resolveUrl = new URL("@mewhhaha/ruwuter/resolve.js", import.meta.url)
  .pathname;
const fixiUrl = new URL("./assets/fixi.js", import.meta.url).pathname;
const fixiExtUrl = new URL("./assets/ext-fixi.js", import.meta.url).pathname;
const stylesUrl = new URL("./assets/tailwind.css", import.meta.url).pathname;
const iconUrl = new URL("./assets/favicon.ico", import.meta.url).pathname;
const cmdUrl = new URL("./assets/cmd.js", import.meta.url).pathname;

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
        <script nonce={nonce} src={fixiUrl} async></script>
        <script nonce={nonce} src={fixiExtUrl} async></script>
        <script nonce={nonce} src={cmdUrl} async></script>
        <script type="module" nonce={nonce} src={clientUrl} async></script>
        <script type="module" nonce={nonce} src={resolveUrl} async></script>
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
