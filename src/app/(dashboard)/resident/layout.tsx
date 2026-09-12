import { requireRoleOrRedirect } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { ResidentSidebarNav, ResidentBottomNav } from "@/components/shared/sidebar-nav";
import { Topbar } from "@/components/shared/topbar";

export default async function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRoleOrRedirect([UserRole.RESIDENT]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-64 flex-col border-r bg-background py-6 md:flex">
        <div className="mb-6 px-6">
          <p className="text-lg font-bold text-primary">Mutiara Cahaya</p>
          <p className="text-xs text-muted-foreground">Portal Warga</p>
        </div>
        <ResidentSidebarNav />
      </aside>

      <div className="flex flex-1 flex-col">
        <Topbar userName={session.user.name} roleLabel="Warga" />
        <main className="flex-1 bg-secondary/30 p-4 md:p-6">{children}</main>
      </div>

      {/* Mobile bottom nav — resident experience is mobile-first per spec */}
      <ResidentBottomNav />
    </div>
  );
}
