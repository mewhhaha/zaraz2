export const cx = (...classes: (string | undefined | false | null)[]) => {
  return classes
    .filter((x): x is string => !!x)
    .map((x) => x.replace(/\s+/g, " "))
    .join(" ");
};
