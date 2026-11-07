import { AuditTable } from "./AuditTable";

export function AuthorityAuditPage() {
  return (
    <main className="mx-auto min-h-[calc(100dvh-3.5rem)] max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">Audit log</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Authority actions are recorded separately from parcel ownership history.
        </p>
      </header>
      <AuditTable />
    </main>
  );
}
