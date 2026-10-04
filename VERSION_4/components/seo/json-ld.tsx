/** Renders a JSON-LD data block. Not executable script, so it needs no CSP exception. `<` is escaped to prevent </script> breakouts. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
