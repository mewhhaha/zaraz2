import type { JSX } from "@mewhhaha/ruwuter/jsx-runtime";

type PrimaryButtonProps = JSX.IntrinsicElements["button"];

export const PrimaryButton = ({ children, ...props }: PrimaryButtonProps) => {
  return (
    <button
      class={`
        group relative flex cursor-pointer items-center justify-center gap-1
        rounded-full border-2 border-slate-500 bg-slate-950 px-4 py-2 text-xl
        underline decoration-green-300 decoration-1 shadow-sm shadow-white
        hover:bg-slate-800 hover:decoration-3
        active:outline-2 active:outline-offset-2 active:outline-white
      `}
      {...props}
    >
      <div
        class={`
          pointer-events-none absolute inset-0 -z-10 rounded-full
          bg-gradient-to-r from-red-300 to-blue-200 blur-md transition-[filter]
          group-hover:blur-sm
        `}
      ></div>
      {children}
    </button>
  );
};
