import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { ApiError } from "../http/api-error.js";
import { ok } from "../http/response.js";
import { HTTP_STATUS } from "../http/status.js";
import { putImage } from "../lib/storage.js";
import {
  verifyTechnician,
  verifyToken,
} from "../middleware/jwt-auth.js";

const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AllowedImageMime = keyof typeof IMAGE_TYPES;

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const SERVICE_COVER_MAX_BYTES = 5 * 1024 * 1024;

/** Legacy local avatar folder, kept only to serve files uploaded before Phase 8. */
export const avatarDirectory = join(process.cwd(), "data", "avatars");

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function detectImageMime(buffer: Buffer): AllowedImageMime | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function singleImage(maxBytes: number, limitLabel: string) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
  });

  return function handleUpload(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    upload.single("file")(request, response, (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          next(
            new ApiError(
              HTTP_STATUS.PAYLOAD_TOO_LARGE,
              "FILE_TOO_LARGE",
              `Image must be under ${limitLabel}.`,
            ),
          );
          return;
        }

        next(
          new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "UPLOAD_ERROR",
            "Upload exactly one image in the 'file' field.",
          ),
        );
        return;
      }

      next(
        new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "UPLOAD_ERROR",
          error instanceof Error ? error.message : "Upload failed.",
        ),
      );
    });
  };
}

function readImage(
  request: Request,
  maxBytes: number,
  limitLabel: string,
) {
  const file = request.file;

  if (!file) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "NO_FILE",
      "No image provided.",
    );
  }

  if (file.size > maxBytes) {
    throw new ApiError(
      HTTP_STATUS.PAYLOAD_TOO_LARGE,
      "FILE_TOO_LARGE",
      `Image must be under ${limitLabel}.`,
    );
  }

  const mime = detectImageMime(file.buffer);

  if (!mime) {
    throw new ApiError(
      HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
      "UNSUPPORTED_MEDIA_TYPE",
      "Use a JPG, PNG or WEBP image.",
    );
  }

  return {
    body: file.buffer,
    contentType: mime,
    extension: IMAGE_TYPES[mime],
  };
}

function uploadHandler(
  prefix: string,
  maxBytes: number,
  limitLabel: string,
) {
  return async function handle(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    try {
      const image = readImage(request, maxBytes, limitLabel);
      const key = `${prefix}/${randomUUID()}.${image.extension}`;
      const url = await putImage({
        key,
        body: image.body,
        contentType: image.contentType,
      });

      response.status(HTTP_STATUS.CREATED).json(ok({ url }));
    } catch (error) {
      next(error);
    }
  };
}

export const uploadsRouter = Router();

uploadsRouter.post(
  "/avatar",
  verifyToken,
  singleImage(AVATAR_MAX_BYTES, "2 MB"),
  uploadHandler("avatars", AVATAR_MAX_BYTES, "2 MB"),
);

uploadsRouter.post(
  "/service-cover",
  ...verifyTechnician,
  singleImage(SERVICE_COVER_MAX_BYTES, "5 MB"),
  uploadHandler("service-covers", SERVICE_COVER_MAX_BYTES, "5 MB"),
);
