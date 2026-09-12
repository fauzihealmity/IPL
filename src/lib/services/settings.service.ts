import { prisma } from "@/lib/prisma";

export type PenaltyType = "FIXED" | "PERCENTAGE";

export interface PenaltyConfig {
  dueDateDay: number; // day of month invoices are due, e.g. 10
  gracePeriodDays: number; // days after dueDate before penalty applies
  penaltyType: PenaltyType;
  penaltyAmount: number; // rupiah if FIXED, percent of iplAmount if PERCENTAGE
}

const DEFAULT_CONFIG: PenaltyConfig = {
  dueDateDay: 10,
  gracePeriodDays: 0,
  penaltyType: "FIXED",
  penaltyAmount: 10000,
};

const SETTINGS_KEY = "billing.penalty_config";

export async function getPenaltyConfig(): Promise<PenaltyConfig> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function setPenaltyConfig(config: PenaltyConfig): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: JSON.stringify(config) },
    update: { value: JSON.stringify(config) },
  });
}

// ── General residence info — used as the header/contact details on
// generated invoices, receipts, and PDF reports. ────────────────────
export interface GeneralSettings {
  residenceName: string;
  address: string;
  phone: string;
  email: string;
}

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  residenceName: "Mutiara Cahaya Residence",
  address: "",
  phone: "",
  email: "",
};

const GENERAL_SETTINGS_KEY = "app.general";

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: GENERAL_SETTINGS_KEY } });
  if (!row) return DEFAULT_GENERAL_SETTINGS;
  try {
    return { ...DEFAULT_GENERAL_SETTINGS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_GENERAL_SETTINGS;
  }
}

export async function setGeneralSettings(settings: GeneralSettings): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: GENERAL_SETTINGS_KEY },
    create: { key: GENERAL_SETTINGS_KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  });
}
