import "server-only";

import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";
import { objectStorageEnvironmentSchema } from "@interlink/validation";

const ASSETS_BUCKET = "assets";

export function isObjectStorageConfigured(): boolean {
  return objectStorageEnvironmentSchema.safeParse(process.env).success;
}

let filesClient: Files | undefined;

export function getAssetsStorage(): Files {
  if (!filesClient) {
    objectStorageEnvironmentSchema.parse(process.env);
    filesClient = new Files({
      adapter: neon({ bucket: ASSETS_BUCKET }),
    });
  }
  return filesClient;
}

export async function uploadAsset(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
) {
  const storage = getAssetsStorage();
  await storage.upload(key, body, { contentType });
  return { key, bucket: ASSETS_BUCKET };
}

export async function getPresignedAssetUrl(key: string, expiresIn = 3600): Promise<string> {
  const storage = getAssetsStorage();
  return storage.url(key, { expiresIn });
}

export async function assetExists(key: string): Promise<boolean> {
  const storage = getAssetsStorage();
  return storage.exists(key);
}

export async function downloadAssetBytes(key: string): Promise<Uint8Array> {
  const storage = getAssetsStorage();
  const file = await storage.download(key);
  return new Uint8Array(await file.arrayBuffer());
}

export async function deleteAsset(key: string): Promise<void> {
  const storage = getAssetsStorage();
  await storage.delete(key);
}
