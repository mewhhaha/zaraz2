import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import * as t from "./+types._root";

export const loader = async ({ request }: t.LoaderArgs) => {
  const url = new URL(request.url);
  return { pathname: url.pathname };
};

export default function Index({
  loaderData: { pathname },
  children,
}: t.ComponentProps) {
  const to = (path: string): [string, string] => {
    return [pathname, path];
  };

  return (
    <div class={`relative size-full`}>
      <header class={`mx-auto max-w-screen-xl bg-slate-950 text-gray-50`}>
        <a class={`underline`} href="/logout">
          logout
        </a>
        <div
          class={`flex divide-x divide-dotted border-b border-white/50 font-serif`}
        >
          <div class={`row-span-2 text-5xl`}>🎉</div>
          <hgroup class={`divide-y divide-dotted divide-white/50`}>
            <h1>
              <a
                class={`
                  bg-gradient-to-r from-white to-white bg-clip-text p-2 text-5xl font-bold
                  text-transparent transition-colors duration-300

                  hover:from-pink-200 hover:to-blue-500
                `}
                href="/"
              >
                zaraz
              </a>
            </h1>
            <p class={`p-2 text-lg font-thin italic`}>
              Zaraz to zrobię, I'll do it in a moment
            </p>
          </hgroup>
        </div>
        <nav class={`pt-6 pb-2 view-transition-[nav]`}>
          <ul class={`flex gap-4`}>
            <li>
              <NavLink href={to("/home")}>
                Home{" "}
                <HomeIcon
                  class={`mb-0.5 inline-block size-5 align-text-bottom`}
                />
              </NavLink>
            </li>
            <li>
              <NavLink href={to("/tasks")}>
                Tasks{" "}
                <AddCircledIcon
                  class={`mb-0.5 inline-block size-5 align-text-bottom`}
                />
              </NavLink>
            </li>
            <li>
              <NavLink href={to("/done")}>
                Done{" "}
                <ListBulletIcon
                  class={`mb-0.5 inline h-[0.5lh] align-text-bottom`}
                />
              </NavLink>
            </li>
          </ul>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

type NavLinkProps = Omit<JSX.IntrinsicElements["a"], "href"> & {
  href: [pathname: string, href: string];
};

const NavLink = ({ href: [pathname, href], children }: NavLinkProps) => {
  const ariaCurrent = pathname.startsWith(href) ? "page" : undefined;

  return (
    <a
      href={href}
      fx-action={href}
      fx-swap="innerHTML"
      fx-target="body"
      aria-current={ariaCurrent}
      class={`
        rounded-lg px-4 py-2 text-lg/loose font-bold text-white underline decoration-sky-500
        decoration-1 underline-offset-2 transition-colors

        hover:bg-white/15

        not-aria-current-page:hover:decoration-3

        active:bg-gray-200 active:text-black active:decoration-black

        aria-current-page:bg-gray-200 aria-current-page:text-black aria-current-page:decoration-black
      `}
    >
      {children}
    </a>
  );
};

type HomeIconProps = JSX.IntrinsicElements["svg"];

const HomeIcon = (props: HomeIconProps) => {
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
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
};

type ListBulletIconProps = JSX.IntrinsicElements["svg"];

const ListBulletIcon = (props: ListBulletIconProps) => {
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
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  );
};

type AddCircledIconProps = JSX.IntrinsicElements["svg"];

const AddCircledIcon = (props: AddCircledIconProps) => {
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
        d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
};
