import { ProfileCell } from "@/components/common/profile-cell";
import { RecordLink } from "@/components/common/record-link";
import { recordHref } from "@/lib/record-links";

export function AdminProfileLink({
  id,
  name,
  subtitle,
  initials,
  label,
}: {
  id?: string | null;
  name: string;
  subtitle?: string | null;
  initials?: string;
  label: string;
}) {
  const cell = <ProfileCell name={name} initials={initials} subtitle={subtitle || undefined} />;
  return id ? (
    <RecordLink href={recordHref("adminAccount", id)} label={label}>
      {cell}
    </RecordLink>
  ) : (
    cell
  );
}
