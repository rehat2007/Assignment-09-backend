import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { requireUser } from "../middleware/auth.js";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 2 * 1024 * 1024;

export const avatarDirectory = join(process.cwd(), "data", "avatars");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!TYPES[file.mimetype]) {
      callback(new Error("Use a JPG, PNG or WEBP image"));
      return;
    }

    callback(null, true);
  },
});

function singleAvatar(
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
        response.status(413).json({ error: "Image must be under 2 MB" });
        return;
      }

      response.status(400).json({ error: error.message });
      return;
    }

    response.status(415).json({
      error: error instanceof Error ? error.message : "Upload failed",
    });
  });
}

export const uploadsRouter = Router();

uploadsRouter.post(
  "/avatar",
  requireUser,
  singleAvatar,
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const file = request.file;

      if (!file) {
        response.status(400).json({ error: "No image provided" });
        return;
      }

      const extension = TYPES[file.mimetype];

      if (!extension) {
        response.status(415).json({ error: "Use a JPG, PNG or WEBP image" });
        return;
      }

      await mkdir(avatarDirectory, { recursive: true });

      const filename = `${randomUUID()}.${extension}`;
      await writeFile(join(avatarDirectory, filename), file.buffer);

      const baseUrl = env.BETTER_AUTH_URL.replace(/\/+$/, "");

      response.status(201).json({
        url: `${baseUrl}/api/v1/uploads/avatars/${filename}`,
      });
    } catch (error) {
      next(error);
    }
  },
);
