import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { pool } from "@workspace/db";
import { requireUser } from "../middleware/requireUser";
import { objectStorageClient } from "../lib/objectStorage";

const router: IRouter = Router();

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
const USE_OBJECT_STORAGE = !!BUCKET_ID;
const LOCAL_UPLOADS_DIR = "/tmp/uploads";
if (!USE_OBJECT_STORAGE) fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only images allowed"));
  },
});

async function saveFile(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
  const ext = path.extname(originalname) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  if (USE_OBJECT_STORAGE) {
    const objectName = `uploads/${filename}`;
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    await bucket.file(objectName).save(buffer, { contentType: mimetype, resumable: false });
  } else {
    fs.writeFileSync(path.join(LOCAL_UPLOADS_DIR, filename), buffer);
  }
  return `/api/uploads/${filename}`;
}

// Get current user's identity verification
router.get("/identity", requireUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).currentUser;
  try {
    const result = await pool.query(
      "SELECT * FROM identity_verifications WHERE user_id=$1",
      [user.id]
    );
    if (result.rows.length === 0) {
      res.json({ status: "none" });
      return;
    }
    const r = result.rows[0];
    res.json({
      id: r.id,
      fullName: r.full_name,
      idNumber: r.id_number,
      extraInfo: r.extra_info,
      idPhotoFrontUrl: r.id_photo_front_url,
      selfieUrl: r.selfie_url,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
    });
  } catch {
    res.status(500).json({ error: "خطأ في جلب البيانات" });
  }
});

// Submit identity verification
router.post(
  "/identity",
  requireUser,
  upload.fields([
    { name: "idPhotoFront", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).currentUser;
    const { fullName, idNumber, extraInfo } = req.body ?? {};
    if (!fullName || !idNumber) {
      res.status(400).json({ error: "الاسم الكامل ورقم الهوية مطلوبان" });
      return;
    }
    try {
      const existing = await pool.query(
        "SELECT id, status FROM identity_verifications WHERE user_id=$1",
        [user.id]
      );
      if (existing.rows.length > 0 && existing.rows[0].status === "approved") {
        res.status(400).json({ error: "هويتك تمت الموافقة عليها مسبقاً" });
        return;
      }

      const files = req.files as { [k: string]: Express.Multer.File[] };
      let idPhotoFrontUrl: string | null = null;
      let selfieUrl: string | null = null;

      if (files?.idPhotoFront?.[0]) {
        const f = files.idPhotoFront[0];
        idPhotoFrontUrl = await saveFile(f.buffer, f.mimetype, f.originalname);
      }
      if (files?.selfie?.[0]) {
        const f = files.selfie[0];
        selfieUrl = await saveFile(f.buffer, f.mimetype, f.originalname);
      }

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE identity_verifications SET full_name=$1, id_number=$2, extra_info=$3,
           id_photo_front_url=COALESCE($4, id_photo_front_url),
           selfie_url=COALESCE($5, selfie_url),
           status='pending', admin_note=NULL, updated_at=NOW()
           WHERE user_id=$6`,
          [fullName, idNumber, extraInfo || null, idPhotoFrontUrl, selfieUrl, user.id]
        );
      } else {
        await pool.query(
          `INSERT INTO identity_verifications (user_id, full_name, id_number, extra_info, id_photo_front_url, selfie_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [user.id, fullName, idNumber, extraInfo || null, idPhotoFrontUrl, selfieUrl]
        );
      }
      res.json({ success: true, message: "تم إرسال طلب التحقق بنجاح" });
    } catch (err: any) {
      res.status(500).json({ error: "خطأ في الإرسال: " + err.message });
    }
  }
);

export default router;
