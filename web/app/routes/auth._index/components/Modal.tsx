import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";

type ModalProps = JSX.IntrinsicElements["div"];

export const Modal = ({ class: className, children, ...props }: ModalProps) => {
  return (
    <div
      class={`
        relative w-128 translate-x-12 translate-y-4 drop-shadow-sm/100
        transition-[transform_opacity] view-name-[passkeys-settings]

        starting:translate-y-0 starting:opacity-0
      `}
      {...props}
    >
      <div
        class={`
          absolute top-0 right-3 size-3 -translate-1.25 -translate-x-1/2 rotate-45 border-t-2
          border-l-2 border-gray-700 bg-slate-950
        `}
      ></div>
      <div
        class={`rounded-lg border-2 border-gray-700 bg-slate-950 p-6 text-gray-100`}
      >
        {children}
      </div>
    </div>
  );
};
