import { z } from "zod";

export const GENDER_OPTIONS = ["woman", "man", "nonbinary"] as const;
export type Gender = (typeof GENDER_OPTIONS)[number];

export const GENDER_PREFERENCE_OPTIONS = [...GENDER_OPTIONS, "any"] as const;
export type GenderPreference = (typeof GENDER_PREFERENCE_OPTIONS)[number];

/** What kind of connection a user is looking for - influences intent-weighted synastry scoring (Stardust Plus). */
export const RELATIONSHIP_INTENT_OPTIONS = ["casual", "passionate", "long_term", "life_partner"] as const;
export type RelationshipIntent = (typeof RELATIONSHIP_INTENT_OPTIONS)[number];

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(50).nullable(),
  bio: z.string().trim().max(500).nullable(),
  gender: z.enum(GENDER_OPTIONS).nullable(),
  genderPreference: z.enum(GENDER_PREFERENCE_OPTIONS).nullable(),
  relationshipIntent: z.enum(RELATIONSHIP_INTENT_OPTIONS).nullable(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export interface PhotoDto {
  id: string;
  url: string;
  position: number;
}

export interface MyProfile {
  id: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  gender: Gender | null;
  genderPreference: GenderPreference | null;
  relationshipIntent: RelationshipIntent | null;
  photos: PhotoDto[];
}
