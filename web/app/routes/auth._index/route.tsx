import { authenticate } from "../auth.$/helpers.mts";
import t from "./+types.route";

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  try {
    const user = await authenticate(request, env.SECRET_KEY);
    return { user };
  } catch {
    return { user: undefined };
  }
};

export default function Route({ loaderData: { user } }: t.ComponentProps) {
  return <div>{user?.userId}</div>;
}
