import { listResidents, listHousesForSelect, deleteResident } from "@/actions/resident.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { SearchInput } from "@/components/shared/search-input";
import { SortableHeader } from "@/components/shared/sortable-header";
import { DataPagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { ResidentFormDialog } from "@/components/residents/resident-form-dialog";
import { Users } from "lucide-react";

export default async function ResidentsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; order?: "asc" | "desc" }>;
}) {
  const searchParams = await searchParamsPromise;
  const [{ items, totalItems, totalPages, page, pageSize }, houses] = await Promise.all([
    listResidents({
      q: searchParams.q,
      page: searchParams.page ? Number(searchParams.page) : 1,
      sort: searchParams.sort,
      order: searchParams.order,
    }),
    listHousesForSelect(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Warga</h1>
          <p className="text-sm text-muted-foreground">{totalItems} warga terdaftar.</p>
        </div>
        <ResidentFormDialog houses={houses} />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <SearchInput placeholder="Cari nama, email, telepon, atau rumah..." />
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum ada data warga"
              description="Tambahkan warga pertama untuk mulai mengelola penghuni perumahan."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortableHeader
                        field="fullName"
                        label="Nama"
                        currentSort={searchParams.sort}
                        currentOrder={searchParams.order}
                      />
                    </TableHead>
                    <TableHead>Rumah</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Akun Login</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((resident) => (
                    <TableRow key={resident.id}>
                      <TableCell className="font-medium">{resident.fullName}</TableCell>
                      <TableCell>
                        {resident.house.block.name}-{resident.house.houseNumber}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {resident.phone ?? "-"}
                        {resident.email ? ` · ${resident.email}` : ""}
                      </TableCell>
                      <TableCell>
                        {resident.user ? (
                          <Badge variant={resident.user.status === "ACTIVE" ? "success" : "secondary"}>
                            {resident.user.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Belum ada</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <ResidentFormDialog
                            houses={houses}
                            resident={{
                              id: resident.id,
                              fullName: resident.fullName,
                              houseId: resident.house.id,
                              phone: resident.phone,
                              email: resident.email,
                              hasLoginAccount: !!resident.user,
                            }}
                          />
                          <ConfirmDeleteButton
                            itemLabel={`Warga ${resident.fullName}`}
                            onConfirm={deleteResident.bind(null, resident.id)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataPagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
