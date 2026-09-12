import { listHouses, deleteHouse } from "@/actions/house.actions";
import { listBlocks } from "@/actions/block.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/shared/badge";
import { SearchInput } from "@/components/shared/search-input";
import { SortableHeader } from "@/components/shared/sortable-header";
import { DataPagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { HouseFormDialog } from "@/components/houses/house-form-dialog";
import { HouseImportDialog } from "@/components/houses/house-import-dialog";
import { BlockManagerDialog } from "@/components/houses/block-manager-dialog";
import { HouseStatus } from "@prisma/client";
import { Home } from "lucide-react";

const STATUS_LABELS: Record<HouseStatus, string> = {
  OWNER_OCCUPIED: "Dihuni Pemilik",
  RENTED: "Disewakan",
  VACANT: "Kosong",
  UNSOLD: "Belum Terjual",
};

const STATUS_VARIANTS: Record<HouseStatus, "success" | "secondary" | "warning" | "destructive"> = {
  OWNER_OCCUPIED: "success",
  RENTED: "secondary",
  VACANT: "warning",
  UNSOLD: "destructive",
};

export default async function HousesPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; order?: "asc" | "desc" }>;
}) {
  const searchParams = await searchParamsPromise;
  const [{ items, totalItems, totalPages, page, pageSize }, blocks] = await Promise.all([
    listHouses({
      q: searchParams.q,
      page: searchParams.page ? Number(searchParams.page) : 1,
      sort: searchParams.sort,
      order: searchParams.order,
    }),
    listBlocks(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Rumah</h1>
          <p className="text-sm text-muted-foreground">
            {totalItems} unit rumah terdaftar di {blocks.length} blok.
          </p>
        </div>
        <div className="flex gap-2">
          <BlockManagerDialog blocks={blocks} />
          <HouseImportDialog />
          <HouseFormDialog blocks={blocks} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <SearchInput placeholder="Cari nomor rumah atau blok..." />
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={Home}
              title="Belum ada data rumah"
              description="Tambahkan rumah pertama atau import dari Excel."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortableHeader
                        field="houseNumber"
                        label="Rumah"
                        currentSort={searchParams.sort}
                        currentOrder={searchParams.order}
                      />
                    </TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Luas Tanah/Bangunan</TableHead>
                    <TableHead>
                      <SortableHeader
                        field="status"
                        label="Status"
                        currentSort={searchParams.sort}
                        currentOrder={searchParams.order}
                      />
                    </TableHead>
                    <TableHead>Warga</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((house) => (
                    <TableRow key={house.id}>
                      <TableCell className="font-medium">
                        {house.block.name}-{house.houseNumber}
                      </TableCell>
                      <TableCell>{house.propertyType ?? "-"}</TableCell>
                      <TableCell>
                        {house.landArea ? Number(house.landArea) : "-"} /{" "}
                        {house.buildingArea ? Number(house.buildingArea) : "-"} m²
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[house.status]}>
                          {STATUS_LABELS[house.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{house._count.residents}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <HouseFormDialog
                            blocks={blocks}
                            house={{
                              id: house.id,
                              houseNumber: house.houseNumber,
                              blockId: house.blockId,
                              propertyType: house.propertyType,
                              landArea: house.landArea ? Number(house.landArea) : null,
                              buildingArea: house.buildingArea ? Number(house.buildingArea) : null,
                              status: house.status,
                            }}
                          />
                          <ConfirmDeleteButton
                            itemLabel={`Rumah ${house.block.name}-${house.houseNumber}`}
                            onConfirm={deleteHouse.bind(null, house.id)}
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
