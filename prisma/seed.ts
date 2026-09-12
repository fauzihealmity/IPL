import { PrismaClient, UserRole, HouseStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ⚠️  DEMO CREDENTIALS — DEVELOPMENT/SEED ONLY.
// Never use these accounts or this password scheme in production.
const DEMO_PASSWORD = "Demo#12345";

async function main() {
  console.log("Seeding Mutiara Cahaya Residence — Phase 1 (foundation) data...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ── Users (demo accounts, spec §43) ─────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@mutiaracahaya.test" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@mutiaracahaya.test",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@mutiaracahaya.test" },
    update: {},
    create: {
      name: "Admin Perumahan",
      email: "manager@mutiaracahaya.test",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const residentUser = await prisma.user.upsert({
    where: { email: "warga@mutiaracahaya.test" },
    update: {},
    create: {
      name: "Budi Santoso",
      email: "warga@mutiaracahaya.test",
      passwordHash,
      role: UserRole.RESIDENT,
    },
  });

  // ── Minimal master data so Phase 1 dashboards read real (if
  // sparse) data instead of an empty database ─────────────────
  const blockA = await prisma.block.upsert({
    where: { name: "A" },
    update: {},
    create: { name: "A" },
  });

  const house = await prisma.house.upsert({
    where: { blockId_houseNumber: { blockId: blockA.id, houseNumber: "01" } },
    update: {},
    create: {
      blockId: blockA.id,
      houseNumber: "01",
      status: HouseStatus.OWNER_OCCUPIED,
    },
  });

  await prisma.resident.upsert({
    where: { userId: residentUser.id },
    update: {},
    create: {
      userId: residentUser.id,
      houseId: house.id,
      fullName: residentUser.name,
      email: residentUser.email,
      joinedAt: new Date(),
    },
  });

  console.log("Seed complete.");
  console.log("Demo accounts (development only):");
  console.log(`  Super Admin : ${superAdmin.email} / ${DEMO_PASSWORD}`);
  console.log(`  Admin       : manager@mutiaracahaya.test / ${DEMO_PASSWORD}`);
  console.log(`  Resident    : ${residentUser.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
