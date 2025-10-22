import type { Route as t } from "./+types._index";

export const loader = ({ request }: t.LoaderArgs) => {
  throw Response.redirect(new URL("/home", request.url).href, 301);
};
