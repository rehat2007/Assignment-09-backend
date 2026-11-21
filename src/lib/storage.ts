import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

export type PutImageInput = {
  /** Server-generated object key, never a browser-supplied filename. */
  key: string;
  body: Buffer;
  contentType: string;
};

export const localUploadDirectory = join(process.cwd(), "data", "uploads");

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

let s3Client: S3Client | null = null;

function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  s3Client = new S3Client({
    region: env.S3_REGION,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    ...(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          },
        }
      : {}),
    forcePathStyle:
      env.S3_FORCE_PATH_STYLE === "true" || Boolean(env.S3_ENDPOINT),
  });

  return s3Client;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function publicUrlFor(key: string) {
  if (env.UPLOAD_DRIVER === "local") {
    return `${trimTrailingSlash(env.BETTER_AUTH_URL)}/api/v1/uploads/files/${key}`;
  }

  if (env.S3_PUBLIC_URL) {
    return `${trimTrailingSlash(env.S3_PUBLIC_URL)}/${key}`;
  }

  if (env.S3_ENDPOINT) {
    return `${trimTrailingSlash(env.S3_ENDPOINT)}/${env.S3_BUCKET}/${key}`;
  }

  return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}

function assertSafeKey(key: string) {
  if (
    !key ||
    key.startsWith("/") ||
    key.includes("\\") ||
    key.split("/").some((part) => part === ".." || part === ".")
  ) {
    throw new Error(`Unsafe upload key: ${key}`);
  }
}

export async function putImage(input: PutImageInput) {
  assertSafeKey(input.key);

  if (env.UPLOAD_DRIVER === "s3") {
    if (!env.S3_BUCKET) {
      throw new Error("S3_BUCKET is not configured.");
    }

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: IMMUTABLE_CACHE_CONTROL,
      }),
    );
  } else {
    const target = join(localUploadDirectory, input.key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, input.body);
  }

  return publicUrlFor(input.key);
}
