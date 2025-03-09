import type * as t from "./+types.document";

const fixiUrl = new URL("./assets/fixi.js", import.meta.url);
const fixiHistoryUrl = new URL("./assets/ext-fixi-history.js", import.meta.url);
const fixiConfirmUrl = new URL("./assets/ext-fixi-confirm.js", import.meta.url);
const fixiConfettiUrl = new URL(
  "./assets/ext-fixi-confetti.js",
  import.meta.url,
);
const stylesUrl = new URL("./assets/tailwind.css", import.meta.url);
const svgUrl = new URL("./assets/favicon.svg", import.meta.url);

export const headers: t.HeadersFunction = () => {
  return {
    "Strict-Transport-Security": "max-age=31536000",
  };
};

export default function Document({
  children,
}: {
  children?: string | undefined;
}) {
  return (
    <html>
      <head>
        <title>Blink example</title>
        <meta charset="UTF-8"></meta>
        <link rel="icon" type="image/svg" href={svgUrl.pathname}></link>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
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
        <script src={fixiUrl.pathname}></script>
        <script src={fixiHistoryUrl.pathname}></script>
        <script src={fixiConfirmUrl.pathname}></script>
        <script src={fixiConfettiUrl.pathname}></script>
        <link rel="stylesheet" href={stylesUrl.pathname} />
        <script type="module">{`console.debug = function(){}`}</script>
      </head>
      <body class={`bg-slate-950 text-amber-50`} hx-boost="true" hx-ext="morph">
        {children}
      </body>
    </html>
  );
}
