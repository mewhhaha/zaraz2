declare global {
  interface FixiEvents {
    "fx:init": Event;
    "fx:inited": Event;
    "fx:process": Event;
    "fx:config": Event;
    "fx:before": Event;
    "fx:after": Event;
    "fx:error": Event;
    "fx:finally": Event;
    "fx:swapped": Event;
  }

  interface FixiAttributes {
    "fx-action"?: string;
    "fx-method"?: "get" | "post" | "delete" | "put" | "patch";
    "fx-trigger"?: keyof FixiEvents | ({} & string);
    "fx-target"?: "body" | "self" | "parent" | "closest" | ({} & string);
    "fx-swap"?:
      | "innerHTML"
      | "outerHTML"
      | "afterbegin"
      | "beforebegin"
      | "beforeend"
      | "afterend"
      | "delete"
      | "none"
      | ({} & string);
  }

  /** @ignore */
  interface HTMLElement extends FixiAttributes {}
}
