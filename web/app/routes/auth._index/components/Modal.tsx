import type { JSX } from "@mewhhaha/ruwuter/jsx-runtime";
import { cx } from "../../../helpers/style";

type ModalProps = JSX.IntrinsicElements["div"];
type ModalPlacement = "anchored" | "page";

export const OpenModal = ({
  class: className,
  children,
  placement = "anchored",
  ...props
}: ModalProps & { placement?: ModalPlacement | undefined }) => {
  return (
    <div
      class={cx(
        `
          z-40 flex max-h-[calc(100dvh-5rem)] min-h-0 max-w-sm flex-col
          drop-shadow-2xl transition-[transform_opacity]
          view-name-[passkeys-settings]
        `,
        placement === "anchored" &&
          `
            fixed inset-x-2 top-16 mx-auto
            sm:absolute sm:inset-x-auto sm:top-0 sm:-right-2 sm:mx-0
            sm:max-h-[80dvh] sm:w-sm sm:translate-y-4
          `,
        placement === "page" &&
          `
            fixed inset-x-2 top-10 mx-auto
            sm:top-1/2 sm:w-sm sm:-translate-y-1/2
          `,
        className,
      )}
      {...props}
    >
      <input type="hidden" name="open" value="true" />
      <div
        class={cx(
          `
            absolute top-0 right-7 size-3 -translate-1.25 -translate-x-1/2
            rotate-45 border-t border-l border-white/10 bg-zinc-950
          `,
          placement === "anchored" && "hidden sm:block",
          placement === "page" && "hidden",
        )}
      ></div>
      <div
        class={`
          flex size-full flex-col overflow-hidden rounded-lg border
          border-white/10 bg-zinc-950/95 p-4 text-zinc-100 shadow-2xl
          shadow-black/40 ring-1 ring-black/20 backdrop-blur-xl
          sm:p-5
        `}
      >
        {children}
      </div>
    </div>
  );
};

export const ClosedModal = ({ class: className, ...props }: ModalProps) => {
  return (
    <div
      class={cx(`view-name-[passkeys-settings]`, className)}
      {...props}
    ></div>
  );
};
