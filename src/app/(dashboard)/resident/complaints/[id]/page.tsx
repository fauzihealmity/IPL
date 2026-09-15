import { notFound } from "next/navigation";
import Link from "next/link";
import { getMyComplaintDetail } from "@/actions/complaint.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/shared/badge";
import { ComplaintStatus } from "@prisma/client";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MessageSquareWarning,
  UserRound,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: "Baru",
  IN_PROGRESS: "Diproses",
  FOLLOW_UP: "Tindak Lanjut",
  RESOLVED: "Selesai",
  REJECTED: "Ditolak",
};

const STATUS_VARIANTS: Record<
  ComplaintStatus,
  "warning" | "secondary" | "success" | "destructive"
> = {
  NEW: "warning",
  IN_PROGRESS: "secondary",
  FOLLOW_UP: "secondary",
  RESOLVED: "success",
  REJECTED: "destructive",
};

export default async function ResidentComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: complaintId } = await params;

  const complaint = await getMyComplaintDetail(complaintId);

  if (!complaint) notFound();

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      {/* Back */}
      <Link
        href="/resident/complaints"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Pengaduan
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">
          Portal Warga
        </p>

        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareWarning className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight">
                  {complaint.title}
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  {complaint.category}
                </p>
              </div>

              <Badge
                variant={STATUS_VARIANTS[complaint.status]}
                className="w-fit shrink-0"
              >
                {STATUS_LABELS[complaint.status]}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Complaint Information */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquareWarning className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">
                Detail Pengaduan
              </h2>

              <p className="text-xs leading-5 text-muted-foreground">
                Informasi pengaduan yang Anda kirimkan.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 md:p-6">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
            <p className="whitespace-pre-wrap text-sm leading-7">
              {complaint.description}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>
                Dikirim{" "}
                {format(complaint.createdAt, "d MMMM yyyy", {
                  locale: id,
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0" />
              <span>
                {format(complaint.createdAt, "HH:mm", {
                  locale: id,
                })}{" "}
                WIB
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Follow Up */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="border-b bg-muted/20 px-5 py-4 md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock3 className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">
                Tindak Lanjut
              </h2>

              <p className="text-xs leading-5 text-muted-foreground">
                Perkembangan penanganan pengaduan Anda.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-5 md:p-6">
          {complaint.updates.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/10 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock3 className="h-5 w-5" />
              </div>

              <p className="mt-3 font-medium">
                Menunggu tindak lanjut
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Pengurus belum memberikan pembaruan untuk
                pengaduan ini.
              </p>
            </div>
          ) : (
            <div className="relative space-y-6">
              {complaint.updates.map((u, index) => (
                <div
                  key={u.id}
                  className="relative flex gap-4"
                >
                  {/* Timeline */}
                  <div className="flex w-8 shrink-0 flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MessageSquareWarning className="h-4 w-4" />
                    </div>

                    {index < complaint.updates.length - 1 && (
                      <div className="mt-2 w-px flex-1 bg-border" />
                    )}
                  </div>

                  {/* Update */}
                  <div className="min-w-0 flex-1 pb-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Badge
                        variant={STATUS_VARIANTS[u.status]}
                        className="w-fit"
                      >
                        {STATUS_LABELS[u.status]}
                      </Badge>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />

                        <span>
                          {format(
                            u.createdAt,
                            "d MMM yyyy HH:mm",
                            {
                              locale: id,
                            }
                          )}{" "}
                          WIB
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-border/60 bg-muted/10 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6">
                        {u.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resident Note */}
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/10 p-4">
        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

        <p className="text-xs leading-5 text-muted-foreground">
          Pengaduan ini hanya dapat dilihat oleh Anda dan pihak
          pengurus yang memiliki akses untuk menanganinya.
        </p>
      </div>
    </div>
  );
}