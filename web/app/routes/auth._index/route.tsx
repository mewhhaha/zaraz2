import type { JSX } from "@mewhhaha/ruwuter/jsx-runtime";
import {
  AuthExpiredError,
  createAuthCookie,
  extractVisitorHeaders,
  registerPasskeyWithToken,
  requireAuth,
  type Auth,
} from "../auth.$/helpers.ts";
import type { Route as t } from "./+types.route";
import { cx } from "../../helpers/style";
import { ClosedModal, OpenModal } from "./components/Modal";
import type { Account } from "../../objects/user";
import authController from "./auth.client.ts?url&no-inline";
import { controllerAttributes } from "../../helpers/controller";

import bgSrc from "../../assets/happy.jpg?url&no-inline";

const authControllerAttributes = controllerAttributes(authController);

class ParseError extends Error {}

const parseRename = (value: unknown) => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    !("name" in value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string"
  ) {
    return new ParseError("Invalid input");
  }

  return { id: value.id, name: value.name };
};

const parseRegister = (value: unknown) => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("token" in value) ||
    typeof value.token !== "string"
  ) {
    return new ParseError("Invalid input");
  }

  return { token: value.token };
};

const getLocale = (request: Request) => {
  return request.headers.get("accept-language")?.split(",")[0] ?? "en-SV";
};

const getTimezone = (request: Request) => {
  return request.headers.get("cf-timezone") ?? "Europe/Stockholm";
};

const passkeyListResponse = (props: PasskeyListProps) => {
  const list = <PasskeyList {...props} />;
  return new Response(list.toReadableStream(), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
};

const isDocumentRequest = (request: Request) => {
  return (
    request.headers.get("sec-fetch-dest") === "document" ||
    request.headers.get("sec-fetch-mode") === "navigate"
  );
};

export const action = async ({ request, env }: t.ActionArgs) => {
  const locale = getLocale(request);
  const timezone = getTimezone(request);

  let auth: Auth;
  try {
    ({ auth } = await requireAuth(request, env.SECRET_KEY, env.OBJECT_USER));
  } catch {
    const cookie = createAuthCookie("auth", env.SECRET_KEY);
    return new Response("unauthorized", {
      status: 401,
      headers: { "Set-Cookie": cookie.destroy() },
    });
  }

  const account = env.OBJECT_USER.get(
    env.OBJECT_USER.idFromName(auth.username),
  ).account();

  if (request.method === "DELETE") {
    const formData = await request.formData();
    const id = formData.get("id");
    if (typeof id !== "string" || id.length === 0) {
      return new Response("id_missing", { status: 400 });
    }

    const passkey = env.OBJECT_PASSKEY.get(env.OBJECT_PASSKEY.idFromString(id));
    const result = await passkey.destruct(auth.username);
    if (typeof result === "string") {
      return new Response(result, { status: 401 });
    }

    const { passkeys } = await account.remove(id);
    return passkeyListResponse({ passkeys, auth, locale, timezone });
  }

  const formData = Object.fromEntries((await request.formData()).entries());

  if (request.method === "PATCH") {
    const fd = parseRename(formData);
    if (fd instanceof ParseError) {
      return new Response(fd.message, { status: 400 });
    }

    const { passkeys } = await account.rename(fd.id, fd.name);
    return passkeyListResponse({ passkeys, auth, locale, timezone });
  }

  if (request.method === "POST" && formData["intent"] === "signout") {
    const cookie = createAuthCookie("auth", env.SECRET_KEY);
    return new Response(null, {
      status: 201,
      headers: { "Set-Cookie": cookie.destroy() },
    });
  }

  if (request.method === "POST" && formData["intent"] === "register") {
    const { username } = auth;
    const visited = extractVisitorHeaders(request.headers);

    const fd = parseRegister(formData);
    if (fd instanceof ParseError) {
      return new Response(fd.message, { status: 400 });
    }

    const { passkeyLink } = await registerPasskeyWithToken({
      token: fd.token,
      username,
      secret: env.SECRET_KEY,
      visited,
      challenges: env.OBJECT_CHALLENGE,
      passkeys: env.OBJECT_PASSKEY,
    });

    const { passkeys } = await account.link(passkeyLink);
    return passkeyListResponse({ passkeys, auth, locale, timezone });
  }
};

export const loader = async ({ request, env }: t.LoaderArgs) => {
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
  const documentRequest = isDocumentRequest(request);

  try {
    // Check if the user is authenticated via cookie
    const { auth, account } = await requireAuth(
      request,
      env.SECRET_KEY,
      env.OBJECT_USER,
    );
    return { auth, account, locale, timezone, documentRequest };
  } catch (error) {
    if (error instanceof AuthExpiredError) {
      return {
        auth: error.auth,
        account: undefined,
        locale,
        timezone,
        documentRequest,
      };
    }

    // If authentication fails or cookie is invalid/expired, return undefined user
    return {
      auth: undefined,
      account: undefined,
      locale,
      timezone,
      documentRequest,
    };
  }
};

// Main component for the authentication route
export default function Route({
  loaderData: { auth, account, locale, timezone, documentRequest },
}: {
  loaderData: Awaited<ReturnType<typeof loader>>;
}) {
  const placement = documentRequest ? "page" : "anchored";

  if (!account) {
    const content = (
      <div {...authControllerAttributes}>
        {auth && (
          <input
            name="credentialId"
            type="hidden"
            value={auth.credentialId}
            data-auth-credential
          />
        )}
        <SignedOut placement={placement} />
      </div>
    );

    return documentRequest ? <AuthPage>{content}</AuthPage> : content;
  }

  const content = (
    <SignedIn
      auth={auth}
      account={account}
      locale={locale}
      timezone={timezone}
      placement={placement}
    />
  );

  return documentRequest ? <AuthPage>{content}</AuthPage> : content;
}

type SignedInProps = {
  auth: Auth;
  account: Account;
  locale: string;
  timezone: string;
  placement?: "anchored" | "page" | undefined;
};

const SignedIn = ({
  auth,
  account,
  locale,
  timezone,
  placement,
}: SignedInProps) => {
  return (
    <OpenModal
      id="passkeys-settings"
      placement={placement}
      {...authControllerAttributes}
    >
      <div class={`flex items-start justify-between gap-4`}>
        <div>
          <p class={`font-mono text-base/7 text-amber-200 sm:text-sm/6`}>
            Account
          </p>
          <h2 class={`max-w-[18ch] text-balance text-2xl font-medium`}>
            {auth.username}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close passkey settings"
          commandfor="passkeys-menu"
          command="close"
          class={`
            relative -m-1 cursor-pointer rounded-md p-1 text-zinc-400
            hover:bg-white/5 hover:text-white
          `}
        >
          <span
            class={`
              pointer-fine:hidden absolute top-1/2 left-1/2
              size-[max(100%,3rem)] -translate-1/2
            `}
            aria-hidden="true"
          />
          <span aria-hidden="true">x</span>
        </button>
      </div>

      <div
        class={`
          mt-5 mb-5 flex min-h-0 grow flex-col overflow-hidden rounded-lg
          border border-white/10 bg-white/5
        `}
      >
        <div
          class={`
            flex flex-wrap items-center justify-between gap-3 border-b
            border-white/10 p-3
          `}
        >
          <h3 class={`text-base font-medium`}>Passkeys</h3>
          <form
            method="POST"
            action="/auth"
            data-auth-action="register-passkey"
            data-username={auth.username}
          >
            <input type="hidden" name="intent" value="register" />
            <button
              type="submit"
              class={`
                cursor-pointer rounded-md border border-white/10 px-2.5
                py-1.5 text-base/6 text-zinc-200
                hover:bg-white/10
                sm:text-sm/6
              `}
            >
              Add passkey
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

      <AuthButton type="button" variant="secondary" data-auth-action="signout">
        Sign out
      </AuthButton>
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
      role="list"
      class={`min-h-0 shrink divide-y divide-white/10 overflow-y-auto`}
    >
      {passkeys.map((passkey) => (
        <li
          style={`view-transition-name: ${btoa(passkey.passkeyId).replaceAll(/[=/+]/g, "")};`}
          class={`flex flex-col gap-3 p-3`}
        >
          <div class={`flex flex-wrap justify-between gap-3`}>
            <div class={`flex min-w-0 items-start gap-2`}>
              <KeyIcon class={`h-lh size-6 shrink-0 stroke-amber-200`} />
              <div class={`min-w-0`}>
                <h4 class={`truncate text-base/7 font-medium sm:text-sm/6`}>
                  {passkey.name}
                </h4>
                <p class={`text-pretty text-base/7 text-zinc-400 sm:text-sm/6`}>
                  Added{" "}
                  <time datetime={passkey.createdAt.toISOString()}>
                    {formatDate(passkey.createdAt, locale, timezone)}
                  </time>
                  {" · "}Last used{" "}
                  <time datetime={passkey.lastUsedAt.toISOString()}>
                    {formatRelativeDate(passkey.lastUsedAt, locale)}
                  </time>
                </p>
              </div>
              <div
                hidden={passkey.passkeyId !== auth.passkeyId}
                class={`
                  rounded-full border border-emerald-400/40 px-2 py-0.5
                  text-[0.8125rem] text-emerald-200
                `}
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
              <RenameButton
                passkeyId={passkey.passkeyId}
                currentName={passkey.name}
              />
              <DeleteButton passkeyId={passkey.passkeyId} auth={auth} />
            </div>
          </div>
          <div
            class={`
              flex gap-2
              sm:hidden
            `}
          >
            <RenameButton
              passkeyId={passkey.passkeyId}
              currentName={passkey.name}
            />
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
      method="POST"
      hidden={passkeyId === auth.passkeyId}
      data-auth-action="delete"
      data-passkey-id={passkeyId}
    >
      <IconButton
        type="submit"
        aria-label="Delete passkey"
        class={`
          override:text-red-400 override:hover:border-red-700
          override:hover:bg-red-700 override:hover:text-white
        `}
      >
        <TrashIconSolid class={`size-5`} />
      </IconButton>
    </form>
  );
};

type RenameButtonProps = {
  passkeyId: string;
  currentName: string;
};

const RenameButton = ({ passkeyId, currentName }: RenameButtonProps) => {
  return (
    <form
      method="POST"
      data-auth-action="rename"
      data-passkey-id={passkeyId}
      data-current-name={currentName}
    >
      <IconButton type="submit" aria-label="Rename passkey">
        <PencilIcon class={`pointer-events-none size-5`} />
      </IconButton>
    </form>
  );
};

type SignedOutProps = {
  placement?: "anchored" | "page" | undefined;
};

const SignedOut = ({ placement }: SignedOutProps) => {
  return (
    <OpenModal id="passkeys-settings" placement={placement}>
      <div class={`flex w-full flex-col gap-5`}>
        <AuthButton
          type="button"
          variant="primary"
          data-auth-action="authenticate"
          class={`
            w-full
          `}
        >
          Continue with passkey
        </AuthButton>

        <form
          method="POST"
          action="/auth"
          class={`flex w-full flex-col gap-3 border-t border-white/10 pt-5`}
          data-auth-action="register-account"
        >
          <div class={`flex w-full flex-col gap-1.5`}>
            <label
              for="register-username"
              class={`text-base/7 text-zinc-300 sm:text-sm/6`}
            >
              New handle <span class={`text-red-300`}>*</span>
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
              class={`
                w-full rounded-md border border-white/10 bg-white/5 px-3 py-2
                text-base/7 text-white placeholder:text-zinc-500
                focus-visible:outline-2 focus-visible:-outline-offset-1
                focus-visible:outline-amber-200
                sm:text-sm/6
              `}
            />
          </div>
          <AuthButton type="submit" variant="secondary" class={`w-full`}>
            Create account
          </AuthButton>
        </form>
      </div>
    </OpenModal>
  );
};

type AuthPageProps = {
  children: JSX.Element;
};

const AuthPage = ({ children }: AuthPageProps) => {
  return (
    <div
      class={`
        relative isolate flex min-h-dvh items-center justify-center overflow-hidden
        p-4
      `}
    >
      <div class={`absolute inset-0 -z-10 bg-zinc-950`}>
        <img
          src={bgSrc}
          alt=""
          class={`
            size-full object-cover object-center opacity-50 blur-xl
            saturate-125
          `}
        />
        <div
          aria-hidden="true"
          class={`
            absolute inset-0 bg-linear-to-b from-black/65 via-zinc-950/50
            to-black/80
          `}
        />
      </div>
      {children}
    </div>
  );
};

const IconButton = ({
  children,
  class: className,
  ...props
}: JSX.IntrinsicElements["button"]) => {
  return (
    <button
      class={cx(
        `
          relative flex cursor-pointer items-center rounded-md border
          border-white/10 bg-white/5 p-2 text-zinc-400
          hover:bg-white/10 hover:text-white
        `,
        className,
      )}
      {...props}
    >
      <span
        class={`
          pointer-fine:hidden absolute top-1/2 left-1/2
          size-[max(100%,3rem)] -translate-1/2
        `}
        aria-hidden="true"
      />
      {children}
    </button>
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

type AuthButtonProps = JSX.IntrinsicElements["button"] & {
  variant?: "primary" | "secondary";
};

const AuthButton = ({
  children,
  class: className,
  variant = "secondary",
  ...props
}: AuthButtonProps) => {
  return (
    <button
      class={cx(
        `
          cursor-pointer rounded-md px-3 py-2 text-center text-base/7
          font-medium transition-colors
          focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-amber-200 disabled:cursor-not-allowed
          disabled:opacity-60 sm:text-sm/6
        `,
        variant === "primary" &&
          `
            bg-amber-200 text-zinc-950 ring-1 ring-amber-200
            hover:bg-amber-100 active:bg-white
          `,
        variant === "secondary" &&
          `
            border border-white/10 bg-white/5 text-zinc-100
            hover:bg-white/10 active:bg-white active:text-zinc-950
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

const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
];

const formatRelativeDate = (date: Date, locale: string) => {
  const formatter = new Intl.RelativeTimeFormat(locale, {
    style: "long",
    numeric: "auto",
  });

  let duration = (date.getTime() - Date.now()) / 1000;
  for (const { amount, unit } of divisions) {
    if (Math.abs(duration) < amount) {
      return formatter.format(Math.round(duration), unit);
    }
    duration /= amount;
  }
  return formatter.format(Math.round(duration), "year");
};
