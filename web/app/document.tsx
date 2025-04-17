import type * as t from "./+types.document";

const fixiUrl = new URL("./assets/fixi.js", import.meta.url);
const fixiExtUrl = new URL("./assets/ext-fixi.js", import.meta.url);

const stylesUrl = new URL("./assets/tailwind.css", import.meta.url);
const iconUrl = new URL("./assets/favicon.ico", import.meta.url);
const cmdUrl = new URL("./assets/cmd.js", import.meta.url);

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
        <link rel="icon" type="image/svg" href={iconUrl.pathname}></link>
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
        <link rel="stylesheet" href={stylesUrl.pathname} />
        <script nonce={nonce} src={fixiUrl.pathname} defer></script>
        <script nonce={nonce} src={fixiExtUrl.pathname} defer></script>
        <script nonce={nonce} src={cmdUrl.pathname} defer></script>
      </head>
      <body class={`bg-slate-950 text-amber-50`}>{children}</body>
    </html>
  );
}
