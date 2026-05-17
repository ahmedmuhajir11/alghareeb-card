import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { pool } from "@workspace/db";
import { requireUser } from "../middleware/requireUser";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only images allowed"));
  },
});

function handleMulterError(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ error: "حجم الصورة كبير جداً، الحد الأقصى 20MB" });
    return;
  }
  if (err) {
    res.status(400).json({ error: err.message || "خطأ في رفع الملف" });
    return;
  }
  next();
}

function toBase64DataUrl(buffer: Buffer, mimetype: string): string {
  return `data:${mimetype};base64,${buffer.toString("base64")}`;
}

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
      country: r.country,
      province: r.province,
      extraInfo: r.extra_info,
      idPhotoFrontUrl: r.id_photo_front_url,
      idPhotoBackUrl: r.id_photo_back_url,
      selfieUrl: r.selfie_url,
      status: r.status,
      adminNote: r.admin_note,
      createdAt: r.created_at,
    });
  } catch {
    res.status(500).json({ error: "خطأ في جلب البيانات" });
  }
});

router.post(
  "/identity",
  requireUser,
  (req: Request, res: Response, next: NextFunction) => {
    upload.fields([
      { name: "idPhotoFront", maxCount: 1 },
      { name: "idPhotoBack", maxCount: 1 },
      { name: "selfie", maxCount: 1 },
    ])(req, res, (err) => handleMulterError(err, req, res, next));
  },
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).currentUser;
    const { fullName, idNumber, country, province, extraInfo } = req.body ?? {};
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
      let idPhotoBackUrl: string | null = null;
      let selfieUrl: string | null = null;

      if (files?.idPhotoFront?.[0]) {
        const f = files.idPhotoFront[0];
        idPhotoFrontUrl = toBase64DataUrl(f.buffer, f.mimetype);
      }
      if (files?.idPhotoBack?.[0]) {
        const f = files.idPhotoBack[0];
        idPhotoBackUrl = toBase64DataUrl(f.buffer, f.mimetype);
      }
      if (files?.selfie?.[0]) {
        const f = files.selfie[0];
        selfieUrl = toBase64DataUrl(f.buffer, f.mimetype);
      }

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE identity_verifications
           SET full_name=$1, id_number=$2, country=$3, province=$4, extra_info=$5,
               id_photo_front_url=COALESCE($6, id_photo_front_url),
               id_photo_back_url=COALESCE($7, id_photo_back_url),
               selfie_url=COALESCE($8, selfie_url),
               status='pending', admin_note=NULL, updated_at=NOW()
           WHERE user_id=$9`,
          [fullName, idNumber, country || null, province || null, extraInfo || null,
           idPhotoFrontUrl, idPhotoBackUrl, selfieUrl, user.id]
        );
      } else {
        await pool.query(
          `INSERT INTO identity_verifications
           (user_id, full_name, id_number, country, province, extra_info, id_photo_front_url, id_photo_back_url, selfie_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [user.id, fullName, idNumber, country || null, province || null, extraInfo || null,
           idPhotoFrontUrl, idPhotoBackUrl, selfieUrl]
        );
      }
      res.json({ success: true, message: "تم إرسال طلب التحقق بنجاح" });
    } catch (err: any) {
      res.status(500).json({ error: "خطأ في الإرسال: " + err.message });
    }
  }
);

export default router;
