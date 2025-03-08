import * as t from "./+types._index";

export const loader = ({ request }: t.LoaderArgs) => {
  throw Response.redirect(new URL("/home", request.url), 301);
};
