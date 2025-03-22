import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";
import * as t from "./+types._root";

export const loader = async ({ request }: t.LoaderArgs) => {};

type NavLinkProps = Omit<JSX.IntrinsicElements["a"], "href"> & {
  href: [pathname: string, href: string];
};

const NavLink = ({ href: [pathname, href], children }: NavLinkProps) => {
  const ariaCurrent = pathname.startsWith(href) ? "page" : undefined;
  const id = href.replace(/\//g, "_");
  return (
    <a
      id={id}
      href={href}
      fx-action={href}
      fx-swap="innerHTML"
      fx-target="body"
      ext-fx-push
      ext-fx-focus={`#${id}`}
      aria-current={ariaCurrent}
      class={`
        relative isolate rounded-lg px-4 py-2 text-lg/loose font-bold whitespace-nowrap
        text-gray-400 underline decoration-sky-500 decoration-1 underline-offset-2

        hover:bg-white/15 hover:text-gray-200

        not-aria-current-page:hover:decoration-3

        active:decoration-amber-400 active:outline-2 active:outline-offset-4 active:outline-white

        aria-current-page:bg-gray-800 aria-current-page:text-gray-300 aria-current-page:decoration-amber-400
        aria-current-page:decoration-3

        hover:aria-current-page:text-gray-200
      `}
    >
      <span
        class={`
          absolute -inset-x-2 -inset-y-1 -z-10 rounded

          [@media(pointer:fine)]:hidden
        `}
      ></span>
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
