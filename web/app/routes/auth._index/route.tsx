import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import { authenticate } from "../auth.$/helpers.mts";
import t from "./+types.route";
import { cx } from "../../helpers/style";

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  const locale =
    request.headers.get("accept-language")?.split(",")[0] ?? "en-SV";
  const timezone = request.headers.get("cf-timezone") ?? "Europe/Stockholm";

  try {
    // Check if the user is authenticated via cookie
    const user = await authenticate(request, env.SECRET_KEY);
    const account = env.OBJECT_USER.get(
      env.OBJECT_USER.idFromName(user.username),
    );
    return { user, ...(await account.data()), locale, timezone };
  } catch {
    // If authentication fails or cookie is invalid/expired, return undefined user
    return { user: undefined, account: undefined, locale, timezone };
  }
};

// Main component for the authentication route
export default function Route({
  loaderData: { user, account, locale, timezone },
}: t.ComponentProps) {
  if (user && account) {
    return (
      <div
        id="passkeys-settings"
        class={`
        w-128 translate-x-12 translate-y-4 shadow-2xl/100
        drop-shadow-sm/100 transition-[transform_opacity]
        view-name-[passkeys-settings]

        starting:translate-y-0 starting:opacity-0 relative
      `}
      >
        <div class="rotate-45 absolute right-3 top-0 -translate-1.25 border-t-2 border-l-2 border-white -translate-x-1/2 size-3 bg-slate-950"></div>
        <div
          class={`
         rounded-lg border-2 bg-slate-950 p-6 
          text-gray-100
   

        `}
        >
          <div class={`flex flex-col`}>
            <hgroup class={`mb-4 space-y-3`}>
              <h2 class={`text-xl font-medium text-gray-200`}>
                Passkeys for {user.username}
              </h2>
              <hr class={`border-slate-700`} />
              <p>
                Passkeys are your webauthn credentials that validate your
                identity using touch, facial recognition, a device password, or
                a PIN.
              </p>
            </hgroup>
            <div
              class={`
              mb-10 divide-y divide-slate-700 overflow-hidden rounded-lg border
              border-slate-700
            `}
            >
              <div
                class={`flex items-center justify-between bg-gray-900 py-4 pr-2 pl-4`}
              >
                <h3 class={`text-base font-semibold`}>Your passkeys</h3>
                <button
                  class={`
                  flex cursor-pointer items-center rounded-lg border border-slate-700
                  bg-gray-900 px-3 py-1.5

                  hover:bg-gray-800
                `}
                >
                  Add new passkey
                </button>
              </div>
              <ul class={`divide-y divide-slate-900`}>
                {account.passkeys.map((passkey) => (
                  <li
                    style={`view-transition-name: ${passkey.passkeyId};`}
                    class={`flex flex-col gap-2 py-4 pr-2 pl-4`}
                  >
                    <div class={`flex justify-between`}>
                      <div class={`flex items-center`}>
                        <KeyIcon class={`inline-block size-6`} />
                        <h4 class={`mx-2 font-semibold`}>{passkey.name}</h4>
                        <div
                          hidden={passkey.passkeyId !== user.passkeyId}
                          class={`rounded-full border border-blue-500 px-2 py-0.5 text-xs text-blue-500`}
                        >
                          Current
                        </div>
                      </div>
                      <div class={`flex gap-2`}>
                        <form fx-action="/auth/passkeys" fx-method="PATCH">
                          <input
                            type="hidden"
                            name="passkey"
                            value={passkey.passkeyId}
                          />
                          <IconButton
                            aria-label="Rename passkey"
                            name="name"
                            ext-fx-prompt="What should we call this passkey?"
                          >
                            <PencilIcon class={`inline-block size-5`} />
                          </IconButton>
                        </form>
                        <form
                          fx-method="DELETE"
                          fx-action="/auth/passkeys"
                          ext-fx-confirm="Are you sure you want to delete this passkey?"
                          // hidden={passkey.passkeyId === user.passkeyId}
                        >
                          <input
                            type="hidden"
                            name="passkey"
                            value={passkey.passkeyId}
                          />
                          <IconButton
                            aria-label="Delete passkey"
                            class={`
                            override:text-red-400

                            override:hover:border-red-700 override:hover:bg-red-700 override:hover:text-white
                          `}
                          >
                            <TrashIconSolid class={`inline-block size-5`} />
                          </IconButton>
                        </form>
                      </div>
                    </div>
                    <p class={`text-gray-400`}>
                      Added on{" "}
                      <time datetime={passkey.createdAt.toISOString()}>
                        {formatDate(passkey.createdAt, locale, timezone)}
                      </time>{" "}
                      | Last used{" "}
                      <time datetime={passkey.lastUsedAt.toISOString()}>
                        {formatRelativeDate(passkey.lastUsedAt, locale)}
                      </time>
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <MenuButton fx-action="/auth/signout">Sign out</MenuButton>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div id="passkeys-settings" class={`flex flex-col gap-4`}>
      <form
        fx-action="/auth/register"
        fx-method="POST"
        ext-fx-passkey-register="/auth/challenge"
        class={`flex flex-col gap-2`}
      >
        <input
          type="text"
          minlength={3}
          maxlength={16}
          name="username"
          autocomplete="username"
          class={`rounded-lg border border-slate-900 px-2 py-1 text-white`}
        />
        <MenuButton>Register</MenuButton>
      </form>
      <MenuButton
        fx-action="/auth/verify"
        fx-method="POST"
        ext-fx-passkey-verify="/auth/challenge"
      >
        Sign in
      </MenuButton>
    </div>
  );
}

const IconButton = ({
  class: className,
  ...props
}: JSX.IntrinsicElements["button"]) => {
  return (
    <button
      class={cx(
        `
        text-gray-400
          flex cursor-pointer items-center rounded-lg border border-slate-700 bg-gray-900 p-2

          hover:bg-gray-800
        `,
        className,
      )}
      {...props}
    ></button>
  );
};

const TrashIconSolid = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path
        fill-rule="evenodd"
        d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z"
        clip-rule="evenodd"
      />
    </svg>
  );
};

const PencilIcon = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      {...props}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
      />
    </svg>
  );
};

type MenuButtonProps = JSX.IntrinsicElements["button"];

const MenuButton = ({
  children,
  class: className,
  ...props
}: MenuButtonProps) => {
  return (
    <button
      class={cx(
        `
          cursor-pointer rounded-lg border border-slate-700 bg-gray-900 py-2 text-white

          hover:bg-gray-800

          active:bg-white active:text-slate-950 active:text-shadow-sm/100
        `,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const KeyIcon = (props: JSX.IntrinsicElements["svg"]) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      {...props}
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
      />
    </svg>
  );
};

const formatDate = (date: Date, locale: string, timezone: string) => {
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
  return formatter.format(date);
};

const formatRelativeDate = (date: Date, locale: string) => {
  const formatter = new Intl.RelativeTimeFormat(locale, {
    style: "long",
    numeric: "auto",
  });
  const now = new Date();
  const diffInSeconds = Math.round((date.getTime() - now.getTime()) / 1000);

  const secondsInMinute = 60;
  const secondsInHour = 3600;
  const secondsInDay = 86400;
  const secondsInWeek = 604800;
  const secondsInMonth = 2629800;
  const secondsInYear = 31557600;

  const absDiff = Math.abs(diffInSeconds);

  if (absDiff < secondsInMinute) {
    return formatter.format(diffInSeconds, "second");
  } else if (absDiff < secondsInHour) {
    const minutes = Math.round(diffInSeconds / secondsInMinute);
    return formatter.format(minutes, "minute");
  } else if (absDiff < secondsInDay) {
    const hours = Math.round(diffInSeconds / secondsInHour);
    return formatter.format(hours, "hour");
  } else if (absDiff < secondsInWeek) {
    const days = Math.round(diffInSeconds / secondsInDay);
    return formatter.format(days, "day");
  } else if (absDiff < secondsInMonth) {
    const weeks = Math.round(diffInSeconds / secondsInWeek);
    return formatter.format(weeks, "week");
  } else if (absDiff < secondsInYear) {
    const months = Math.round(diffInSeconds / secondsInMonth);
    return formatter.format(months, "month");
  } else {
    const years = Math.round(diffInSeconds / secondsInYear);
    return formatter.format(years, "year");
  }
};
