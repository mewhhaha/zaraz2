import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import {
  authenticate,
  createAuthCookie,
  extractVisitorHeaders,
  parseToken,
  type Auth,
} from "../auth.$/helpers.mts";
import t from "./+types.route";
import { cx } from "../../helpers/style";
import { ClosedModal, OpenModal } from "./components/Modal";
import { makePasskeyLink, type Account } from "../../objects/user.mts";

import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types";

class ParseError extends Error {
  summary: string;

  constructor(message: string) {
    super(message);
    this.name = "ParseError";
    this.summary = message;
  }
}

const parseRename = (value: unknown) => {
  if (typeof value !== "object" || value === null) {
    return new ParseError("Invalid input");
  }

  if (!("id" in value) || !("name" in value)) {
    return new ParseError("Invalid input");
  }

  const { id, name } = value;

  if (typeof id !== "string" || typeof name !== "string") {
    return new ParseError("Invalid input");
  }

  return { id, name };
};

const parseRegister = (value: unknown) => {
  if (typeof value !== "object" || value === null) {
    return new ParseError("Invalid input");
  }

  if (!("token" in value)) {
    return new ParseError("Invalid input");
  }

  const { token } = value;

  if (typeof token !== "string") {
    return new ParseError("Invalid input");
  }

  return { token };
};

const getLocale = (request: Request) => {
  return request.headers.get("accept-language")?.split(",")[0] ?? "en-SV";
};

const getTimezone = (request: Request) => {
  return request.headers.get("cf-timezone") ?? "Europe/Stockholm";
};

export const action = async ({ request, context: [env] }: t.ActionArgs) => {
  const locale = getLocale(request);
  const timezone = getTimezone(request);

  const auth = await authenticate(request, env.SECRET_KEY);

  const account = env.OBJECT_USER.get(
    env.OBJECT_USER.idFromName(auth.username),
  ).account();

  if (request.method === "DELETE") {
    const id = new URL(request.url).searchParams.get("id")?.toString();
    if (!id) {
      return new Response("id_missing", { status: 400 });
    }

    const passkey = env.OBJECT_PASSKEY.get(env.OBJECT_PASSKEY.idFromString(id));
    const result = await passkey.destruct(auth.username);
    if (typeof result === "string") {
      return new Response(result, { status: 401 });
    }

    const { passkeys } = await account.remove(id);
    const list = (
      <PasskeyList
        passkeys={passkeys}
        auth={auth}
        locale={locale}
        timezone={timezone}
      />
    );
    return new Response(list.toString(), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  const formData = Object.fromEntries((await request.formData()).entries());

  if (request.method === "PATCH") {
    const fd = parseRename(formData);
    if (fd instanceof ParseError) {
      return new Response(fd.summary, { status: 400 });
    }

    const { passkeys } = await account.rename(fd.id, fd.name);
    const list = (
      <PasskeyList
        passkeys={passkeys}
        auth={auth}
        locale={locale}
        timezone={timezone}
      />
    );
    return new Response(list.toString(), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (request.method === "POST" && formData["intent"] === "signout") {
    const cookie = createAuthCookie("auth", env.SECRET_KEY);
    return new Response(null, {
      status: 204,
      headers: {
        "Set-Cookie": cookie.destroy(),
      },
    });
  }

  if (request.method === "POST" && formData["intent"] === "register") {
    const { username } = await authenticate(request, env.SECRET_KEY);

    const visited = extractVisitorHeaders(request.headers);

    const fd = parseRegister(formData);
    if (fd instanceof ParseError) {
      return new Response(fd.summary, { status: 400 });
    }

    const { json, challengeId } = await parseToken<RegistrationJSON>(
      fd.token,
      env.SECRET_KEY,
    );

    const challenge = await env.OBJECT_CHALLENGE.get(
      env.OBJECT_CHALLENGE.idFromString(challengeId),
    ).finish();
    if (typeof challenge === "string") {
      throw new Response(challenge, { status: 400 });
    }

    const credentialName = json.id;
    const passkey = env.OBJECT_PASSKEY.get(
      env.OBJECT_PASSKEY.idFromName(credentialName),
    );

    const data = await passkey.register({
      username,
      json,
      challengeId,
      visited,
    });

    if (typeof data === "string") {
      throw new Response(data, { status: 400 });
    }

    const passkeyLink = makePasskeyLink({
      passkeyId: passkey.id,
      credentialId: credentialName,
      username,
    });

    const { passkeys } = await account.link(passkeyLink);

    const list = (
      <PasskeyList
        passkeys={passkeys}
        auth={auth}
        locale={locale}
        timezone={timezone}
      />
    );
    return new Response(list.toString(), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }
};

export const loader = async ({ request, context: [env] }: t.LoaderArgs) => {
  const url = new URL(request.url);
  const newState = url.searchParams.get("newState");
  if (newState === "closed") {
    throw new Response((<ClosedModal id="passkeys-settings" />).toString(), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  const locale = getLocale(request);
  const timezone = getTimezone(request);

  try {
    // Check if the user is authenticated via cookie
    const auth = await authenticate(request, env.SECRET_KEY);
    const user = env.OBJECT_USER.get(env.OBJECT_USER.idFromName(auth.username));
    return { auth, account: await user.account().data(), locale, timezone };
  } catch {
    // If authentication fails or cookie is invalid/expired, return undefined user
    return { auth: undefined, account: undefined, locale, timezone };
  }
};

// Main component for the authentication route
export default function Route({
  loaderData: { auth, account, locale, timezone },
}: t.ComponentProps) {
  if (!auth || !account) {
    return <SignedOut />;
  }

  return (
    <SignedIn
      auth={auth}
      account={account}
      locale={locale}
      timezone={timezone}
    />
  );
}

type SignedInProps = {
  auth: Auth;
  account: Account;
  locale: string;
  timezone: string;
};

const SignedIn = ({ auth, account, locale, timezone }: SignedInProps) => {
  return (
    <OpenModal id="passkeys-settings">
      <h2
        class={`
          mb-4 text-lg font-medium text-gray-200

          sm:text-xl
        `}
      >
        You are <span class={`text-blue-200`}>{auth.username}</span>
      </h2>

      <div
        class={`
          mb-10 flex min-h-0 grow flex-col divide-y divide-slate-700 overflow-hidden rounded-lg
          border border-slate-700
        `}
      >
        <div
          class={`flex flex-wrap items-center justify-between gap-4 bg-gray-900 px-2 py-4`}
        >
          <h3 class={`pl-2 text-base font-semibold`}>Your passkeys</h3>
          <form
            fx-action="/auth"
            fx-method="POST"
            fx-target="#passkeys-list"
            ext-fx-passkey-register="/auth/challenge"
          >
            <input type="hidden" name="username" value={auth.username} />
            <button
              class={`
                flex cursor-pointer items-center rounded-lg border border-slate-700
                bg-gray-900 px-3 py-1.5

                hover:bg-gray-800
              `}
              name="intent"
              value="register"
            >
              Add new passkey
            </button>
          </form>
        </div>
        <PasskeyList
          passkeys={account.passkeys}
          auth={auth}
          locale={locale}
          timezone={timezone}
        />
      </div>

      <MenuButton
        name="intent"
        value="signout"
        fx-action="/auth"
        fx-method="POST"
        ext-fx-reload
      >
        Sign out
      </MenuButton>
    </OpenModal>
  );
};

type PasskeyListProps = {
  passkeys: Account["passkeys"];
  auth: Auth;
  locale: string;
  timezone: string;
};

const PasskeyList = ({
  passkeys,
  auth,
  locale,
  timezone,
}: PasskeyListProps) => {
  return (
    <ul
      id="passkeys-list"
      class={`min-h-0 shrink divide-y divide-slate-900 overflow-y-auto`}
    >
      {passkeys.map((passkey) => (
        <li
          style={`view-transition-name: ${btoa(passkey.passkeyId).replaceAll(/[=/+]/g, "")};`}
          class={`flex flex-col gap-2 py-4 pr-2 pl-4`}
        >
          <div class={`flex flex-wrap justify-between gap-4`}>
            <div class={`flex items-center`}>
              <KeyIcon class={`inline-block size-6`} />
              <h4 class={`mx-2 font-semibold`}>{passkey.name}</h4>
              <div
                hidden={passkey.passkeyId !== auth.passkeyId}
                class={`rounded-full border border-blue-500 px-2 py-0.5 text-xs text-blue-500`}
              >
                Current
              </div>
            </div>
            <div
              class={`
                hidden gap-2

                sm:flex
              `}
            >
              <RenameButton passkeyId={passkey.passkeyId} />
              <DeleteButton passkeyId={passkey.passkeyId} auth={auth} />
            </div>
          </div>
          <p class={`text-balance text-gray-400`}>
            Added on{" "}
            <time datetime={passkey.createdAt.toISOString()}>
              {formatDate(passkey.createdAt, locale, timezone)}
            </time>
            &shy; | Last used{" "}
            <time datetime={passkey.lastUsedAt.toISOString()}>
              {formatRelativeDate(passkey.lastUsedAt, locale)}
            </time>
          </p>
          <div
            class={`
              flex gap-2

              sm:hidden
            `}
          >
            <RenameButton passkeyId={passkey.passkeyId} />
            <DeleteButton passkeyId={passkey.passkeyId} auth={auth} />
          </div>
        </li>
      ))}
    </ul>
  );
};

type DeleteButtonProps = {
  passkeyId: string;
  auth: Auth;
};

const DeleteButton = ({ passkeyId, auth }: DeleteButtonProps) => {
  return (
    <form
      fx-method="DELETE"
      fx-action="/auth"
      fx-target="#passkeys-list"
      ext-fx-confirm="Are you sure you want to delete this passkey?"
      hidden={passkeyId === auth.passkeyId}
    >
      <input type="hidden" name="id" value={passkeyId} />
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
  );
};

type RenameButtonProps = {
  passkeyId: string;
};

const RenameButton = ({ passkeyId }: RenameButtonProps) => {
  return (
    <form fx-action="/auth" fx-target="#passkeys-list" fx-method="PATCH">
      <input type="hidden" name="id" value={passkeyId} />
      <IconButton
        aria-label="Rename passkey"
        name="name"
        ext-fx-prompt="What should we call this passkey?"
      >
        <PencilIcon class={`inline-block size-5`} />
      </IconButton>
    </form>
  );
};

const SignedOut = () => {
  return (
    <OpenModal id="passkeys-settings">
      <div class={`flex flex-col`}>
        <h2 class={`mb-4 text-xl font-medium text-gray-200`}>
          Already have an account?
        </h2>

        <MenuButton
          fx-action="/auth/verify"
          fx-method="POST"
          ext-fx-passkey-verify="/auth/challenge"
          ext-fx-reload
          class={`
            mb-10

            override:bg-green-800

            override:hover:bg-green-700

            override:active:bg-white
          `}
        >
          Sign in
        </MenuButton>

        <h2 class={`mb-4 text-xl font-medium text-gray-200`}>
          Register a new account
        </h2>
        <form
          fx-action="/auth/register"
          fx-method="POST"
          ext-fx-passkey-register="/auth/challenge"
          class={`flex flex-col gap-2`}
        >
          <div class={`flex flex-col gap-2`}>
            <label for="register-username" class={`text-sm text-gray-400`}>
              Username <span class={`text-red-500`}>*</span>
            </label>
            <input
              id="register-username"
              type="text"
              required
              minlength={3}
              maxlength={16}
              name="username"
              autocomplete="username"
              placeholder="e.g. johndoe"
              class={`rounded-lg border border-slate-900 px-3 py-2 text-white`}
            />
          </div>
          <MenuButton>Register</MenuButton>
        </form>
      </div>
    </OpenModal>
  );
};

const IconButton = ({
  class: className,
  ...props
}: JSX.IntrinsicElements["button"]) => {
  return (
    <button
      class={cx(
        `
          flex cursor-pointer items-center rounded-lg border border-slate-700 bg-gray-900 p-2
          text-gray-400

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
