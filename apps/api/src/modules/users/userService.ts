import type { MyProfile, ProfileUpdateInput } from "@stardust/shared-types";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { getPhotoStorage } from "./storage/storageRegistry.js";

export const MAX_PHOTOS = 6;

function toMyProfile(user: {
  id: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  gender: string | null;
  genderPreference: string | null;
  relationshipIntent: string | null;
  photos: { id: string; url: string; position: number }[];
}): MyProfile {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    gender: user.gender as MyProfile["gender"],
    genderPreference: user.genderPreference as MyProfile["genderPreference"],
    relationshipIntent: user.relationshipIntent as MyProfile["relationshipIntent"],
    photos: user.photos,
  };
}

export async function getMyProfile(userId: string): Promise<MyProfile> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  return toMyProfile(user);
}

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<MyProfile> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
    include: { photos: { orderBy: { position: "asc" } } },
  });
  return toMyProfile(user);
}

export async function addPhoto(userId: string, file: { buffer: Buffer; mimeType: string }) {
  const existingCount = await prisma.photo.count({ where: { userId } });
  if (existingCount >= MAX_PHOTOS) {
    throw new HttpError(400, "TOO_MANY_PHOTOS", `You can have at most ${MAX_PHOTOS} photos`);
  }

  const { url } = await getPhotoStorage().save({ buffer: file.buffer, mimeType: file.mimeType, userId });

  return prisma.photo.create({
    data: { userId, url, position: existingCount },
  });
}

export async function deletePhoto(userId: string, photoId: string): Promise<void> {
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo || photo.userId !== userId) {
    throw new HttpError(404, "PHOTO_NOT_FOUND", "Photo not found");
  }

  await getPhotoStorage().delete(photo.url);
  await prisma.photo.delete({ where: { id: photoId } });
}
