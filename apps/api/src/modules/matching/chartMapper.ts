import type { HouseCusp, NatalChart, Placement } from "@stardust/shared-types";

export interface NatalChartRow {
  providerId: string;
  computedAt: Date;
  placements: unknown; // Prisma Json
  houses: unknown; // Prisma Json
}

/** Reconstructs the typed NatalChart shape from a Prisma NatalChart row's Json columns. */
export function toNatalChart(row: NatalChartRow): NatalChart {
  return {
    providerId: row.providerId,
    computedAt: row.computedAt.toISOString(),
    placements: row.placements as unknown as Placement[],
    houses: row.houses as unknown as HouseCusp[],
  };
}
