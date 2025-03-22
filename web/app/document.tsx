import type * as t from "./+types.document";

const fixiUrl = new URL("./assets/fixi.js", import.meta.url);
const fixiPromptUrl = new URL("./assets/ext-fixi-prompt.js", import.meta.url);
const fixiHistoryUrl = new URL("./assets/ext-fixi-history.js", import.meta.url);
const fixiConfirmUrl = new URL("./assets/ext-fixi-confirm.js", import.meta.url);
const fixiConfettiUrl = new URL(
  "./assets/ext-fixi-confetti.js",
  import.meta.url,
);
const fixiFocusUrl = new URL("./assets/ext-fixi-focus.js", import.meta.url);
const fixiResetUrl = new URL("./assets/ext-fixi-reset.js", import.meta.url);

const stylesUrl = new URL("./assets/tailwind.css", import.meta.url);
const svgUrl = new URL("./assets/favicon.svg", import.meta.url);
const bgUrl = new URL("./assets/happy.jpg", import.meta.url);

export const loader = ({ context: [env] }: t.LoaderArgs) => {
  const nonce = crypto.randomUUID();
  return { nonce: undefined };
};

export const headers: t.HeadersFunction = ({ loaderData }) => {
  const { nonce } = loaderData;
  const headers = new Headers();
  headers.set("Strict-Transport-Security", "max-age=31536000");

  if (nonce) {
    headers.set(
      "Content-Security-Policy",
      `
script-src 'strict-dynamic' 'nonce-${nonce}' 'unsafe-inline' http: https:;
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
    <html>
      <head>
        <title>zaraz-2</title>
        <meta charset="UTF-8"></meta>
        <link rel="icon" type="image/svg" href={svgUrl.pathname}></link>
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
        <link
          href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href={stylesUrl.pathname} />
        <script nonce={nonce} src={fixiUrl.pathname} async></script>
        <script nonce={nonce} src={fixiHistoryUrl.pathname} async></script>
        <script nonce={nonce} src={fixiConfirmUrl.pathname} async></script>
        <script nonce={nonce} src={fixiPromptUrl.pathname} async></script>
        <script nonce={nonce} src={fixiConfettiUrl.pathname} async></script>
        <script nonce={nonce} src={fixiFocusUrl.pathname} async></script>
        <script nonce={nonce} src={fixiResetUrl.pathname} async></script>
      </head>
      <body class="bg-slate-950 text-amber-50">
        <img
          src={bgUrl.pathname}
          alt=""
          class="absolute inset-0 -z-10 w-full h-full"
        />
        {children}
      </body>
    </html>
  );
}
