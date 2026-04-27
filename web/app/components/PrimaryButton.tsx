import type { JSX } from "@mewhhaha/ruwuter/jsx-runtime";

type PrimaryButtonProps = JSX.IntrinsicElements["button"];

export const PrimaryButton = ({ children, ...props }: PrimaryButtonProps) => {
  return (
    <button
      class={`
        group relative flex cursor-pointer items-center justify-center gap-1
        rounded-md bg-amber-200 px-3 py-2 text-base/7 font-medium
        text-zinc-950 ring-1 ring-amber-200
        hover:bg-amber-100
        active:outline-2 active:outline-offset-2 active:outline-white
        sm:text-sm/6
      `}
      {...props}
    >
      {children}
    </button>
  );
};
