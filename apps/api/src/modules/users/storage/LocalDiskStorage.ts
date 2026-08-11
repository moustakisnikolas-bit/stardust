import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { env } from "../../../config/env.js";
import type { PhotoStorage } from "./PhotoStorage.js";

export const UPLOADS_DIR = fileURLToPath(new URL("../../../../uploads/photos", import.meta.url));
const PUBLIC_PATH_PREFIX = "/uploads/photos";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Dev/MVP-friendly default: writes to a local folder served via
 * express.static, no external service or credentials required. Swap for an
 * S3Storage (or similar) implementing the same PhotoStorage interface once
 * a real object-storage provider is chosen - see storageRegistry.ts for the
 * same env-gated registration pattern used by the OAuth/astrology providers.
 */
export class LocalDiskStorage implements PhotoStorage {
  readonly id = "local-disk";

  async save(input: { buffer: Buffer; mimeType: string; userId: string }): Promise<{ url: string }> {
    const extension = EXTENSION_BY_MIME[input.mimeType];
    if (!extension) {
      throw new Error(`Unsupported image type: ${input.mimeType}`);
    }

    await mkdir(UPLOADS_DIR, { recursive: true });
    const filename = `${input.userId}-${randomUUID()}.${extension}`;
    await writeFile(path.join(UPLOADS_DIR, filename), input.buffer);

    return { url: `${env.API_PUBLIC_URL}${PUBLIC_PATH_PREFIX}/${filename}` };
  }

  async delete(url: string): Promise<void> {
    const filename = url.split("/").pop();
    if (!filename) return;
    await unlink(path.join(UPLOADS_DIR, filename)).catch(() => {});
  }
}
