import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center font-sans">
      <p className="font-heading text-5xl font-bold tracking-tight text-primary">404</p>
      <p className="text-sm text-muted-foreground">This page could not be found.</p>
      <Link
        href="/clients"
        className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
