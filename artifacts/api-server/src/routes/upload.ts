import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { objectStorageClient } from "../lib/objectStorage";
import { UploadImageResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
const USE_OBJECT_STORAGE = !!BUCKET_ID;

const LOCAL_UPLOADS_DIR = "/tmp/uploads";
if (!USE_OBJECT_STORAGE) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.post("/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = `${randomUUID()}${ext}`;

    if (USE_OBJECT_STORAGE) {
      const objectName = `uploads/${filename}`;
      const bucket = objectStorageClient.bucket(BUCKET_ID);
      const file = bucket.file(objectName);
      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        resumable: false,
      });
    } else {
      const localPath = path.join(LOCAL_UPLOADS_DIR, filename);
      fs.writeFileSync(localPath, req.file.buffer);
    }

    const fileUrl = `/api/uploads/${filename}`;
    res.json(UploadImageResponse.parse({ url: fileUrl }));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to upload file: " + err.message });
  }
});

router.get("/uploads/:filename", async (req, res): Promise<void> => {
  try {
    const filename = req.params.filename;

    if (USE_OBJECT_STORAGE) {
      const objectName = `uploads/${filename}`;
      const bucket = objectStorageClient.bucket(BUCKET_ID);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      const [metadata] = await file.getMetadata();
      const contentType = (metadata.contentType as string) || "application/octet-stream";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      file.createReadStream().pipe(res);
    } else {
      const localPath = path.join(LOCAL_UPLOADS_DIR, filename);
      if (!fs.existsSync(localPath)) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.sendFile(localPath);
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to serve file: " + err.message });
  }
});

export default router;
