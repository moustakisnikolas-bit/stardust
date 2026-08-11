import { LocalDiskStorage } from "./LocalDiskStorage.js";
import type { PhotoStorage } from "./PhotoStorage.js";

// Only one implementation exists today. Adding a cloud provider later means
// a new class implementing PhotoStorage plus an env-gated switch here -
// same pattern as astrology providers / OAuth providers elsewhere in this app.
const storage: PhotoStorage = new LocalDiskStorage();

export function getPhotoStorage(): PhotoStorage {
  return storage;
}
