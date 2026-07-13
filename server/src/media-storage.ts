import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";
import { basename } from "node:path";
import ImageKit from "@imagekit/nodejs";
import { config } from "./config.js";

type UploadedFile = {
  filename: string;
  originalname: string;
  path: string;
};

let imagekitClient: ImageKit | null = null;

function publicLocalUrl(filename: string) {
  return new URL(`/uploads/${filename}`, config.serverPublicUrl).toString();
}

function fieldFolder(slugOrId: string) {
  const root = config.imagekit.folder.replace(/\/+$/, "");
  const safeField = slugOrId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${root}/${safeField}`;
}

function getImageKitClient() {
  if (!imagekitClient) {
    imagekitClient = new ImageKit({ privateKey: config.imagekit.privateKey });
  }
  return imagekitClient;
}

export function normalizeMediaUrl(url: string) {
  if (!url || /^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("/uploads/")) return new URL(url, config.serverPublicUrl).toString();
  return url;
}

export async function storeFieldImage(file: UploadedFile, fieldSlugOrId: string) {
  if (!config.imagekit.enabled) {
    return { url: publicLocalUrl(file.filename) };
  }

  try {
    const upload = await getImageKitClient().files.upload({
      file: createReadStream(file.path),
      fileName: file.originalname || basename(file.path),
      folder: fieldFolder(fieldSlugOrId),
      tags: ["zenvy", "field"],
      useUniqueFileName: true,
    });

    if (!upload.url) throw new Error("ImageKit upload did not return a public URL.");
    await rm(file.path, { force: true });
    return { url: upload.url, fileId: upload.fileId ?? null };
  } catch (error) {
    await rm(file.path, { force: true });
    throw error;
  }
}
