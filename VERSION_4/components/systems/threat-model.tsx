import type { ThreatModel as ThreatModelData } from "@/content/schema";

type Block = {
  key: keyof ThreatModelData;
  code: string;
  label: string;
  /** What the block means in a threat model. Generic wording, not a claim about the system. */
  hint: string;
};

// The seven blocks, in reading order. The codes are fixed so a block keeps its code when a
// project leaves another one empty.
const BLOCKS: readonly Block[] = [
  { key: "assets", code: "TM-01", label: "Assets", hint: "What has to stay intact" },
  { key: "attackSurface", code: "TM-02", label: "Attack surface", hint: "Where input enters" },
  { key: "trustBoundaries", code: "TM-03", label: "Trust boundaries", hint: "Where trust changes" },
  { key: "threatActors", code: "TM-04", label: "Threat actors", hint: "Who or what pushes on it" },
  { key: "assumptions", code: "TM-05", label: "Assumptions", hint: "What has to be true" },
  { key: "failureModes", code: "TM-06", label: "Failure modes", hint: "How it goes wrong" },
  { key: "controls", code: "TM-07", label: "Controls", hint: "What holds the line" },
];

/** The blocks of a threat model that actually have entries. Empty blocks are not drawn. */
export function threatModelBlocks(model: ThreatModelData): (Block & { items: string[] })[] {
  return BLOCKS.flatMap((block) => {
    const items = model[block.key];
    return items.length > 0 ? [{ ...block, items }] : [];
  });
}

/**
 * Threat model as a document, not a card wall: one row per block, label in the left gutter, the
 * entries as a plain list. Each row stacks on mobile. Server component, no JS.
 */
export function ThreatModel({ model }: { model: ThreatModelData }) {
  const blocks = threatModelBlocks(model);
  if (blocks.length === 0) return null;

  return (
    <dl className="border-t">
      {blocks.map((block) => (
        <div key={block.key} className="grid gap-6 border-b py-8 lg:grid-cols-12 lg:gap-x-6">
          <dt className="lg:col-span-4 xl:col-span-3">
            <span className="block label-mono text-muted">{block.code}</span>
            <span className="mt-3 block text-lg font-medium tracking-tight text-foreground">
              {block.label}
            </span>
            <span className="mt-2 block text-sm text-muted">{block.hint}</span>
          </dt>
          <dd className="lg:col-span-8 xl:col-span-9">
            <ul className="flex max-w-3xl flex-col gap-3">
              {block.items.map((item) => (
                <li key={item} className="relative pl-6 text-base text-foreground">
                  <span aria-hidden className="absolute top-3 left-0 block h-px w-3 bg-muted" />
                  {item}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}
