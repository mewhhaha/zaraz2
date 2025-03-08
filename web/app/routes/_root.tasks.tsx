import * as t from "./+types._root.tasks";

export default function Tasks({ children }: t.ComponentProps) {
  return (
    <div>
      Tasks
      {children}
    </div>
  );
}
