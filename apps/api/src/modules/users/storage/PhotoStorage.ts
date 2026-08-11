export interface PhotoStorage {
  readonly id: string;
  save(input: { buffer: Buffer; mimeType: string; userId: string }): Promise<{ url: string }>;
  /** Best-effort - callers should not fail the request if this throws (e.g. object already gone). */
  delete(url: string): Promise<void>;
}
