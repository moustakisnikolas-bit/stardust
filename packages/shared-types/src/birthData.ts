import { z } from "zod";

export const birthDataSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Expected HH:mm")
    .nullable(),
  timeUnknown: z.boolean().default(false),
  birthLocationRaw: z.string().min(2).max(200),
  // lat/lon come from the client's location picker (backed by GET
  // /api/onboarding/geocode); the server independently resolves the IANA
  // timezone and historical UTC offset from these coordinates itself rather
  // than trusting a client-supplied timezone.
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type BirthDataInput = z.infer<typeof birthDataSchema>;

export interface GeocodeResult {
  displayName: string;
  latitude: number;
  longitude: number;
  provider: string;
  placeId?: string;
}
