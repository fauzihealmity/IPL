import Link from "next/link";
import { listAuditLogs } from "@/actions/audit-log.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/shared/badge";
import { SearchInput } from "@/components/shared/search-input";
import { DataPagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const ACTION_VARIANTS: Record<string, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  CREATE: "success",
  UPDATE: "secondary",
  DELETE: "destructive",
  IMPORT: "secondary",
  GENERATE: "success",
  CANCEL: "destructive",
  APPLY_PENALTY: "warning",
  SEND_REMINDERS: "secondary",
  CHANGE_PASSWORD: "outline",
};

function buildFilterUrl(base: string, params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) usp.set(key, value);
  }
  const qs = usp.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function AuditLogsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ q?: string; page?: string; module?: string; action?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const { items, totalItems, totalPages, page, pageSize, availableModules, availableActions } =
    await listAuditLogs({
      q: searchParams.q,
      page: searchParams.page ? Number(searchParams.page) : 1,
      module: searchParams.module,
      action: searchParams.action,
    });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          {totalItems} entri — setiap perubahan data penting tercatat otomatis di sini. Tidak
          pernah menyimpan password atau data sensitif lain.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Modul:</span>
        <Link href={buildFilterUrl("/admin/audit-logs", { action: searchParams.action, q: searchParams.q })}>
          <Badge variant={!searchParams.module ? "default" : "outline"} className="cursor-pointer">
            Semua
          </Badge>
        </Link>
        {availableModules.map((m) => (
          <Link
            key={m}
            href={buildFilterUrl("/admin/audit-logs", { module: m, action: searchParams.action, q: searchParams.q })}
          >
            <Badge variant={searchParams.module === m ? "default" : "outline"} className="cursor-pointer">
              {m}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Aksi:</span>
        <Link href={buildFilterUrl("/admin/audit-logs", { module: searchParams.module, q: searchParams.q })}>
          <Badge variant={!searchParams.action ? "default" : "outline"} className="cursor-pointer">
            Semua
          </Badge>
        </Link>
        {availableActions.map((a) => (
          <Link
            key={a}
            href={buildFilterUrl("/admin/audit-logs", { module: searchParams.module, action: a, q: searchParams.q })}
          >
            <Badge variant={searchParams.action === a ? "default" : "outline"} className="cursor-pointer">
              {a}
            </Badge>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <SearchInput placeholder="Cari nama/email admin atau ID record..." />
          </div>

          {items.length === 0 ? (
            <EmptyState icon={ScrollText} title="Tidak ada entri audit log" />
          ) : (
            <>
              <div className="space-y-2">
                {items.map((log) => (
                  <details key={log.id} className="rounded-md border">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <span className="text-xs text-muted-foreground">
                        {format(log.createdAt, "d MMM yyyy HH:mm:ss", { locale: id })}
                      </span>
                      <Badge variant={ACTION_VARIANTS[log.action] ?? "outline"}>{log.action}</Badge>
                      <Badge variant="outline">{log.module}</Badge>
                      <span className="font-medium">
                        {log.user ? `${log.user.name} (${log.user.role === "SUPER_ADMIN" ? "Super Admin" : log.user.role === "ADMIN" ? "Admin" : "Warga"})` : "Sistem"}
                      </span>
                      {log.recordId && (
                        <span className="font-mono text-xs text-muted-foreground">#{log.recordId.slice(0, 8)}</span>
                      )}
                    </summary>
                    <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                      <div className="mb-1">
                        IP: {log.ipAddress ?? "-"} · User Agent: {log.userAgent ?? "-"}
                      </div>
                      {(log.oldValue || log.newValue) ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {log.oldValue ? (
                            <div>
                              <p className="mb-1 font-medium text-foreground">Sebelum</p>
                              <pre className="max-h-48 overflow-auto rounded bg-secondary p-2">
                                {JSON.stringify(log.oldValue, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                          {log.newValue ? (
                            <div>
                              <p className="mb-1 font-medium text-foreground">Sesudah</p>
                              <pre className="max-h-48 overflow-auto rounded bg-secondary p-2">
                                {JSON.stringify(log.newValue, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p>Tidak ada rincian data untuk entri ini.</p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
              <div className="mt-4">
                <DataPagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
