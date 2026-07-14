import { SECTIONS } from "@/lib/nav";

export function SectionStub({ slug }: { slug: string }) {
  const section = SECTIONS.find((s) => s.slug === slug);
  if (!section) return null;
  const Icon = section.icon;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-7" />
      </span>
      <div className="space-y-1.5">
        <h2 className="font-heading text-xl font-semibold">{section.label}</h2>
        <p className="text-sm text-muted-foreground">
          Specified in the source workbook and scaffolded in navigation. This demo builds out{" "}
          <span className="font-medium text-foreground">Clients &amp; Profiles</span> end to end.
          {section.note ? ` ${section.note}.` : ""}
        </p>
      </div>
    </div>
  );
}
