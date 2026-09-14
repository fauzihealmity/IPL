import { requireRoleOrRedirect } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { AdminSidebarNav } from "@/components/shared/sidebar-nav";
import { Topbar } from "@/components/shared/topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRoleOrRedirect([UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r bg-background py-6 md:flex">
        <div className="mb-6 px-6">
          <p className="text-lg font-bold text-primary">Mutiara Cahaya Residence</p>
          <p className="text-xs text-muted-foreground">Panel Admin</p>
        </div>
        <AdminSidebarNav role={session.user.role} />
      </aside>
      <div className="flex flex-1 flex-col">
        <Topbar
          userName={session.user.name}
          roleLabel={session.user.role === UserRole.SUPER_ADMIN ? "Super Admin" : "Admin"}
        />
        <main className="flex-1 bg-secondary/30 p-6">{children}</main>
      </div>
    </div>
  );
}
