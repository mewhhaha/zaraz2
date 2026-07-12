export const controllerAttributes = (reference: string) => {
  const hashIndex = reference.lastIndexOf("#");
  if (hashIndex === -1) {
    throw new TypeError(
      `Ruwuter controller reference has no module id: ${reference}`,
    );
  }

  return {
    "data-rw-controller": reference.slice(0, hashIndex),
    "data-rw-controller-id": reference.slice(hashIndex + 1),
  } as const;
};
