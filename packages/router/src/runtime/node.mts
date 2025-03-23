export const S: unique symbol = Symbol();
export const N: unique symbol = Symbol();

export type Html = {
  [N]: true;
  text: string;
  toString: () => string;
};

function toString(this: Html): string {
  return this.text;
}

export const into = (text: string): Html => {
  return {
    [N]: true,
    text,
    toString,
  };
};

export const isHtml = (child: unknown): child is Html => {
  return (
    typeof child === "object" &&
    child !== null &&
    N in child &&
    child[N] === true
  );
};
