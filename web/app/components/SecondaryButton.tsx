import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";

type SecondaryButtonProps = JSX.IntrinsicElements["button"];

export const SecondaryButton = ({
  children,
  ...props
}: SecondaryButtonProps) => {
  return (
    <button
      class={`
        flex cursor-pointer items-center justify-center gap-1 rounded-full border-2
        border-slate-500 px-4 py-2 text-xl underline decoration-gray-200 decoration-1
        backdrop-blur-sm

        hover:bg-slate-800 hover:decoration-3

        active:outline-2 active:outline-offset-2 active:outline-white

        group
      `}
      {...props}
    >
      {children}
    </button>
  );
};
