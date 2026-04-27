import type { JSX } from "@mewhhaha/ruwuter/jsx-runtime";
import { event, events } from "@mewhhaha/ruwuter/events";
import {
  AuthExpiredError,
  createAuthCookie,
  extractVisitorHeaders,
  parseToken,
  requireAuth,
  type Auth,
} from "../auth.$/helpers.ts";
import type { Route as t } from "./+types.route";
import { cx } from "../../helpers/style";
import { ClosedModal, OpenModal } from "./components/Modal";
import { makePasskeyLink, type Account } from "../../objects/user";
import {
  authenticate as authenticateClient,
  register as registerClient,
} from "../../helpers/passkey";
import type { RegistrationJSON } from "@passwordless-id/webauthn/dist/esm/types";

const PASSKEYS_LIST_SELECTOR = "#passkeys-list";
const DELETE_PASSKEY_CONFIRM = "Are you sure you want to delete this passkey?";
const RENAME_PASSKEY_PROMPT = "What should we call this passkey?";
const bgSrc = new URL("../../assets/happy.jpg", import.meta.url).pathname;

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

const isDocumentRequest = (request: Request) => {
  return (
    request.headers.get("sec-fetch-dest") === "document" ||
    request.headers.get("sec-fetch-mode") === "navigate"
  );
};

export const action = async ({ request, context: [env] }: t.ActionArgs) => {
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
    const list = (
      <PasskeyList
        passkeys={passkeys}
        auth={auth}
        locale={locale}
        timezone={timezone}
      />
    );
    return new Response(list.toReadableStream(), {
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
    return new Response(list.toReadableStream(), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
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

    return new Response(list.toReadableStream(), {
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
}: t.ComponentProps) {
  const placement = documentRequest ? "page" : "anchored";

  if (!account) {
    const content = (
      <>
        {auth && (
          <input
            name="credentialId"
            type="hidden"
            value={auth.credentialId}
            on={event.mount<HTMLInputElement>(async function (event, signal) {
              "use client";
              const input = event.currentTarget;
              const token = await authenticateClient(
                "/auth/challenge",
                [input.value],
                { signal },
              );
              const formData = new FormData();
              formData.set("token", token);
              const response = await fetch("/auth/verify", {
                method: "POST",
                body: formData,
                signal,
              });
              if (response.ok) {
                window.location.href = "/home";
              }
            })}
          />
        )}
        <SignedOut placement={placement} />
      </>
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
  const registerAction = {
    username: auth.username,
  };

  return (
    <OpenModal id="passkeys-settings" placement={placement}>
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
            on={events(
              registerAction,
              event.submit<HTMLFormElement, typeof registerAction>(
                async function (this, event, signal) {
                  "use client";

                  try {
                    const token = await registerClient(
                      "/auth/challenge",
                      this.username,
                      { signal },
                    );
                    const formData = new FormData(event.currentTarget);
                    formData.set("token", token);

                    const response = await fetch(event.currentTarget.action, {
                      method: event.currentTarget.method,
                      body: formData,
                      signal,
                    });
                    await window.swap(response, {
                      target: PASSKEYS_LIST_SELECTOR,
                    });
                  } catch {
                    window.alert?.(
                      "Something went wrong adding your passkey. Please try again.",
                    );
                  }
                },
                { preventDefault: true },
              ),
            )}
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

      <AuthButton
        type="button"
        variant="secondary"
        on={event.click<HTMLButtonElement>(async function (ev, signal) {
          "use client";

          const button = ev.currentTarget;
          if (button.disabled) {
            return;
          }
          button.disabled = true;
          const formData = new FormData();
          formData.set("intent", "signout");
          try {
            const response = await fetch("/auth", {
              method: "POST",
              body: formData,
              signal,
            });
            if (response.ok) {
              window.location.href = "/";
              return;
            }
            await window.swap(response, { target: "body", swap: "innerHTML" });
          } catch {
            window.alert?.("Could not sign you out. Please try again.");
          } finally {
            button.disabled = false;
          }
        })}
      >
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
      on={events(
        { passkeyId },
        event.submit<HTMLFormElement, { passkeyId: string }>(
          async function (this, submitEvent, signal) {
            "use client";
            if (
              !(submitEvent.currentTarget instanceof HTMLFormElement) ||
              signal.aborted
            ) {
              return;
            }

            if (!window.confirm(DELETE_PASSKEY_CONFIRM)) {
              return;
            }

            const formData = new FormData();
            formData.set("id", this.passkeyId);

            try {
              const response = await fetch("/auth", {
                method: "DELETE",
                body: formData,
                signal,
              });
              await window.swap(response, {
                target: PASSKEYS_LIST_SELECTOR,
              });
            } catch {
              window.alert?.(
                "Failed to delete the passkey. Please try again in a moment.",
              );
            }
          },
          { preventDefault: true },
        ),
      )}
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
      on={events(
        { passkeyId, currentName },
        event.submit<
          HTMLFormElement,
          { passkeyId: string; currentName: string }
        >(
          async function (this, _submitEvent, signal) {
            "use client";

            const nextName = window.prompt(
              RENAME_PASSKEY_PROMPT,
              this.currentName,
            );
            if (!nextName) {
              return;
            }

            const formData = new FormData();
            formData.set("id", this.passkeyId);
            formData.set("name", nextName);

            try {
              const response = await fetch("/auth", {
                method: "PATCH",
                body: formData,
                signal,
              });
              await window.swap(response, {
                target: PASSKEYS_LIST_SELECTOR,
              });
            } catch {
              window.alert?.(
                "Could not rename this passkey. Please try again.",
              );
            }
          },
          { preventDefault: true },
        ),
      )}
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
          on={event.click<HTMLButtonElement>(
            async function (ev, signal) {
              "use client";
              const button = ev.currentTarget;
              if (button.disabled || signal.aborted) {
                return;
              }
              button.disabled = true;
              try {
                const token = await authenticateClient(
                  "/auth/challenge",
                  undefined,
                  { signal },
                );
                const formData = new FormData();
                formData.set("token", token);
                const response = await fetch("/auth/verify", {
                  method: "POST",
                  body: formData,
                  signal,
                });
                if (response.ok) {
                  window.location.href = "/";
                  return;
                } else {
                  throw new Error(await response.text());
                }
              } catch {
                window.alert?.(
                  "Something went wrong signing you in. Please try again.",
                );
              } finally {
                button.disabled = false;
              }
            },
            { preventDefault: true },
          )}
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
          on={event.submit<HTMLFormElement>(
            async function (event, signal) {
              "use client";

              const formData = new FormData(event.currentTarget);
              const submitter = event.submitter;
              if (
                submitter instanceof HTMLButtonElement &&
                submitter.name &&
                !formData.has(submitter.name)
              ) {
                formData.append(submitter.name, submitter.value);
              }
              const username = formData.get("username");
              if (!username) {
                window.alert?.("Please choose a username to continue.");
                return;
              }
              try {
                const token = await registerClient(
                  "/auth/challenge",
                  username.toString(),
                  { signal },
                );
                formData.set("token", token);
                const response = await fetch("/auth/register", {
                  method: "POST",
                  body: formData,
                  signal,
                });

                if (response.ok) {
                  window.location.href = "/";
                } else {
                  await window.swap(response, {
                    target: "body",
                    swap: "innerHTML",
                  });
                }
              } catch {
                window.alert?.(
                  "We could not register you right now. Please try again.",
                );
              }
            },
            { preventDefault: true },
          )}
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

const isRedirect = (response: Response) => {
  return (
    (response.status >= 300 && response.status < 400) ||
    response.type === "opaqueredirect"
  );
};

const findRedirectLocation = (response: Response) => {
  if (!isRedirect(response)) return;
  const location = response.headers.get("Location");
  return location;
};
