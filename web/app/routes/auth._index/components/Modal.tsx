import type { JSX } from "@mewhhaha/fx-router/jsx-runtime";

type ModalProps = JSX.IntrinsicElements["div"];

export const OpenModal = ({
  class: className,
  children,
  ...props
}: ModalProps) => {
  return (
    <div
      class={`
        absolute top-0 -right-6 flex max-h-[80vh] min-h-0 w-128 max-w-[97vw] translate-y-4 flex-col
        drop-shadow-sm/100 transition-[transform_opacity]
        view-name-[passkeys-settings]

        starting:translate-y-0 starting:opacity-0
      `}
      {...props}
    >
      <input type="hidden" name="open" value="true" />
      <div
        class={`
          absolute top-0 right-3 size-3 -translate-1.25 -translate-x-1/2 rotate-45 border-t-2
          border-l-2 border-gray-700 bg-slate-950
        `}
      ></div>
      <div
        class={`
          flex size-full flex-col overflow-hidden rounded-lg border-2 border-gray-700
          bg-slate-950 p-2 text-gray-100

          sm:p-6
        `}
      >
        {children}
      </div>
    </div>
  );
};

export const ClosedModal = ({
  class: className,
  children,
  ...props
}: ModalProps) => {
  return <div class={`view-name-[passkeys-settings]`} {...props}></div>;
};
