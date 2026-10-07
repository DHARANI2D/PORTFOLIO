/**
 * Security considerations: a plain bullet list, two columns on wide screens. Each row is a
 * statement the reader can check. Server component.
 */
export function SecurityConsiderations({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="grid border-t lg:grid-cols-2 lg:gap-x-12">
      {items.map((item) => (
        <li key={item} className="relative border-b py-6 pl-6 text-base text-foreground">
          <span
            aria-hidden
            className="absolute top-[34px] left-0 block size-1.5 rounded-[1px] bg-muted"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
