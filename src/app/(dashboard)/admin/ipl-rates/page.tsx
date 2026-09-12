import { listIplRates, deleteIplRate } from "@/actions/ipl-rate.actions";
import { listBlocks } from "@/actions/block.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { IplRateFormDialog } from "@/components/ipl-rates/ipl-rate-form-dialog";
import { Wallet } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default async function IplRatesPage() {
  const [rates, blocks] = await Promise.all([listIplRates(), listBlocks()]);
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarif IPL</h1>
          <p className="text-sm text-muted-foreground">
            Tarif berlaku ke depan — invoice yang sudah terbit tidak berubah saat tarif diedit.
          </p>
        </div>
        <IplRateFormDialog blocks={blocks} />
      </div>

      <Card>
        <CardContent className="pt-6">
          {rates.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Belum ada tarif IPL"
              description="Tambahkan tarif untuk setiap blok sebelum menerbitkan tagihan."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blok</TableHead>
                  <TableHead>Nama Tarif</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead>Berlaku</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => {
                  const isActive =
                    rate.effectiveFrom <= now && (!rate.effectiveTo || rate.effectiveTo >= now);
                  return (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.block.name}</TableCell>
                      <TableCell>{rate.name}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(Number(rate.amount))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(rate.effectiveFrom, "d MMM yyyy", { locale: id })} —{" "}
                        {rate.effectiveTo ? format(rate.effectiveTo, "d MMM yyyy", { locale: id }) : "sekarang"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "success" : "secondary"}>
                          {isActive ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <IplRateFormDialog
                            blocks={blocks}
                            rate={{
                              id: rate.id,
                              blockId: rate.blockId,
                              name: rate.name,
                              amount: Number(rate.amount),
                              effectiveFrom: rate.effectiveFrom,
                              effectiveTo: rate.effectiveTo,
                            }}
                          />
                          <ConfirmDeleteButton
                            itemLabel={`Tarif ${rate.name}`}
                            onConfirm={deleteIplRate.bind(null, rate.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
