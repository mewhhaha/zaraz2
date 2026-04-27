import type { JSX } from "@mewhhaha/ruwuter/jsx-runtime";

type SecondaryButtonProps = JSX.IntrinsicElements["button"];

export const SecondaryButton = ({
  children,
  ...props
}: SecondaryButtonProps) => {
  return (
    <button
      class={`
        group flex cursor-pointer items-center justify-center gap-1 rounded-md
        border border-white/10 px-3 py-2 text-base/7 font-medium
        text-zinc-100 backdrop-blur-sm
        hover:bg-white/10
        active:outline-2 active:outline-offset-2 active:outline-white
        sm:text-sm/6
      `}
      {...props}
    >
      {children}
    </button>
  );
};
