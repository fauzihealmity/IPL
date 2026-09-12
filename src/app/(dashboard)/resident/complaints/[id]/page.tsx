import { notFound } from "next/navigation";
import Link from "next/link";
import { getMyComplaintDetail } from "@/actions/complaint.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/shared/badge";
import { ComplaintStatus } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  NEW: "Baru",
  IN_PROGRESS: "Diproses",
  FOLLOW_UP: "Tindak Lanjut",
  RESOLVED: "Selesai",
  REJECTED: "Ditolak",
};

const STATUS_VARIANTS: Record<ComplaintStatus, "warning" | "secondary" | "success" | "destructive"> = {
  NEW: "warning",
  IN_PROGRESS: "secondary",
  FOLLOW_UP: "secondary",
  RESOLVED: "success",
  REJECTED: "destructive",
};

export default async function ResidentComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: complaintId } = await params;
  const complaint = await getMyComplaintDetail(complaintId);
  if (!complaint) notFound();

  return (
    <div className="space-y-4 pb-16 md:pb-0">
      <Link href="/resident/complaints" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{complaint.title}</h1>
          <p className="text-sm text-muted-foreground">{complaint.category}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[complaint.status]}>{STATUS_LABELS[complaint.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deskripsi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{complaint.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Dikirim {format(complaint.createdAt, "d MMMM yyyy HH:mm", { locale: id })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tindak Lanjut</CardTitle>
        </CardHeader>
        <CardContent>
          {complaint.updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Menunggu tindak lanjut dari admin.</p>
          ) : (
            <div className="space-y-4">
              {complaint.updates.map((u) => (
                <div key={u.id} className="border-l-2 border-primary pl-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[u.status]}>{STATUS_LABELS[u.status]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(u.createdAt, "d MMM yyyy HH:mm", { locale: id })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{u.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
