import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireAdmin } from "../middleware/requireAdmin";

const router: IRouter = Router();

// ─── PUBLIC ROUTES ───────────────────────────────────────────────────────────

router.get("/dev/service-cards", async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string;
    if (!type || !["websites", "mobile_apps"].includes(type)) {
      res.status(400).json({ error: "type must be websites or mobile_apps" });
      return;
    }
    const result = await pool.query(
      `SELECT id, service_type, name_ar, name_en, description_ar, description_en, image_url, icon, price, is_active, sort_order
       FROM dev_service_cards WHERE service_type = $1 AND is_active = true ORDER BY sort_order ASC, id ASC`,
      [type]
    );
    res.json(result.rows.map(r => ({
      id: r.id, serviceType: r.service_type, nameAr: r.name_ar, nameEn: r.name_en,
      descriptionAr: r.description_ar, descriptionEn: r.description_en,
      imageUrl: r.image_url, icon: r.icon, price: r.price, isActive: r.is_active, sortOrder: r.sort_order,
    })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/dev/form-questions", async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string;
    if (!type || !["websites", "mobile_apps"].includes(type)) {
      res.status(400).json({ error: "type must be websites or mobile_apps" });
      return;
    }
    const result = await pool.query(
      `SELECT id, service_type, title_ar, title_en, question_type, options, is_required, sort_order, is_active
       FROM dev_form_questions WHERE service_type = $1 AND is_active = true ORDER BY sort_order ASC, id ASC`,
      [type]
    );
    res.json(result.rows.map(r => ({
      id: r.id, serviceType: r.service_type, titleAr: r.title_ar, titleEn: r.title_en,
      questionType: r.question_type, options: r.options || [], isRequired: r.is_required,
      sortOrder: r.sort_order, isActive: r.is_active,
    })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/dev/settings", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`SELECT * FROM dev_settings LIMIT 1`);
    if (result.rows.length === 0) {
      res.json({ whatsappNumber: "", websitesEnabled: true, mobileAppsEnabled: true,
        websitesHeroTitle: "تطوير وبرمجة المواقع", websitesHeroDesc: "", websitesHeroImage: "",
        mobileAppsHeroTitle: "تطوير وبرمجة تطبيقات الجوال", mobileAppsHeroDesc: "", mobileAppsHeroImage: "" });
      return;
    }
    const r = result.rows[0];
    res.json({
      whatsappNumber: r.whatsapp_number || "", websitesEnabled: r.websites_enabled, mobileAppsEnabled: r.mobile_apps_enabled,
      websitesHeroTitle: r.websites_hero_title || "تطوير وبرمجة المواقع", websitesHeroDesc: r.websites_hero_desc || "", websitesHeroImage: r.websites_hero_image || "",
      mobileAppsHeroTitle: r.mobile_apps_hero_title || "تطوير وبرمجة تطبيقات الجوال", mobileAppsHeroDesc: r.mobile_apps_hero_desc || "", mobileAppsHeroImage: r.mobile_apps_hero_image || "",
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/dev/requests", async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceType, answers, selectedServiceCard } = req.body;
    if (!serviceType || !["websites", "mobile_apps"].includes(serviceType)) {
      res.status(400).json({ error: "Invalid serviceType" }); return;
    }
    const result = await pool.query(
      `INSERT INTO dev_project_requests (service_type, answers, selected_service_card, submitted_at) VALUES ($1,$2,$3,NOW()) RETURNING id`,
      [serviceType, JSON.stringify(answers || {}), selectedServiceCard || null]
    );
    res.json({ ok: true, id: result.rows[0].id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── ADMIN SERVICE CARDS ──────────────────────────────────────────────────────
router.get("/admin/dev/service-cards", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string;
    let q = `SELECT * FROM dev_service_cards`;
    const params: any[] = [];
    if (type && ["websites","mobile_apps"].includes(type)) { q += ` WHERE service_type=$1`; params.push(type); }
    q += ` ORDER BY sort_order ASC, id ASC`;
    const result = await pool.query(q, params);
    res.json(result.rows.map(r => ({
      id: r.id, serviceType: r.service_type, nameAr: r.name_ar, nameEn: r.name_en,
      descriptionAr: r.description_ar, descriptionEn: r.description_en,
      imageUrl: r.image_url, icon: r.icon, price: r.price, isActive: r.is_active, sortOrder: r.sort_order,
    })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/admin/dev/service-cards", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceType, nameAr, nameEn, descriptionAr, descriptionEn, imageUrl, icon, price, isActive, sortOrder } = req.body;
    if (!serviceType || !["websites","mobile_apps"].includes(serviceType)) { res.status(400).json({ error: "Invalid serviceType" }); return; }
    if (!nameAr) { res.status(400).json({ error: "nameAr required" }); return; }
    const r = await pool.query(
      `INSERT INTO dev_service_cards (service_type,name_ar,name_en,description_ar,description_en,image_url,icon,price,is_active,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [serviceType, nameAr, nameEn||null, descriptionAr||null, descriptionEn||null, imageUrl||null, icon||null, price||null, isActive!==false, sortOrder||0]
    );
    res.json({ ok: true, id: r.rows[0].id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/admin/dev/service-cards/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { nameAr, nameEn, descriptionAr, descriptionEn, imageUrl, icon, price, isActive, sortOrder } = req.body;
    await pool.query(
      `UPDATE dev_service_cards SET name_ar=$1,name_en=$2,description_ar=$3,description_en=$4,image_url=$5,icon=$6,price=$7,is_active=$8,sort_order=$9 WHERE id=$10`,
      [nameAr, nameEn||null, descriptionAr||null, descriptionEn||null, imageUrl||null, icon||null, price||null, isActive!==false, sortOrder||0, id]
    );
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/admin/dev/service-cards/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(`DELETE FROM dev_service_cards WHERE id=$1`, [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── ADMIN FORM QUESTIONS ─────────────────────────────────────────────────────
router.get("/admin/dev/form-questions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string;
    let q = `SELECT * FROM dev_form_questions`;
    const params: any[] = [];
    if (type && ["websites","mobile_apps"].includes(type)) { q += ` WHERE service_type=$1`; params.push(type); }
    q += ` ORDER BY sort_order ASC, id ASC`;
    const result = await pool.query(q, params);
    res.json(result.rows.map(r => ({
      id: r.id, serviceType: r.service_type, titleAr: r.title_ar, titleEn: r.title_en,
      questionType: r.question_type, options: r.options||[], isRequired: r.is_required,
      sortOrder: r.sort_order, isActive: r.is_active,
    })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/admin/dev/form-questions", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceType, titleAr, titleEn, questionType, options, isRequired, sortOrder } = req.body;
    if (!serviceType || !["websites","mobile_apps"].includes(serviceType)) { res.status(400).json({ error: "Invalid serviceType" }); return; }
    const validTypes = ["single","multi","text","textarea","link","color","budget"];
    if (!questionType || !validTypes.includes(questionType)) { res.status(400).json({ error: "Invalid questionType" }); return; }
    if (!titleAr) { res.status(400).json({ error: "titleAr required" }); return; }
    const r = await pool.query(
      `INSERT INTO dev_form_questions (service_type,title_ar,title_en,question_type,options,is_required,sort_order,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING id`,
      [serviceType, titleAr, titleEn||null, questionType, JSON.stringify(options||[]), isRequired!==false, sortOrder||0]
    );
    res.json({ ok: true, id: r.rows[0].id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put("/admin/dev/form-questions/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { titleAr, titleEn, questionType, options, isRequired, sortOrder, isActive } = req.body;
    await pool.query(
      `UPDATE dev_form_questions SET title_ar=$1,title_en=$2,question_type=$3,options=$4,is_required=$5,sort_order=$6,is_active=$7 WHERE id=$8`,
      [titleAr, titleEn||null, questionType, JSON.stringify(options||[]), isRequired!==false, sortOrder||0, isActive!==false, id]
    );
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete("/admin/dev/form-questions/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(`DELETE FROM dev_form_questions WHERE id=$1`, [parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── ADMIN SETTINGS ───────────────────────────────────────────────────────────
router.put("/admin/dev/settings", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { whatsappNumber, websitesEnabled, mobileAppsEnabled, websitesHeroTitle, websitesHeroDesc, websitesHeroImage, mobileAppsHeroTitle, mobileAppsHeroDesc, mobileAppsHeroImage } = req.body;
    await pool.query(
      `INSERT INTO dev_settings (id,whatsapp_number,websites_enabled,mobile_apps_enabled,websites_hero_title,websites_hero_desc,websites_hero_image,mobile_apps_hero_title,mobile_apps_hero_desc,mobile_apps_hero_image)
       VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET whatsapp_number=$1,websites_enabled=$2,mobile_apps_enabled=$3,websites_hero_title=$4,websites_hero_desc=$5,websites_hero_image=$6,mobile_apps_hero_title=$7,mobile_apps_hero_desc=$8,mobile_apps_hero_image=$9`,
      [whatsappNumber||"", websitesEnabled!==false, mobileAppsEnabled!==false,
       websitesHeroTitle||"تطوير وبرمجة المواقع", websitesHeroDesc||"", websitesHeroImage||"",
       mobileAppsHeroTitle||"تطوير وبرمجة تطبيقات الجوال", mobileAppsHeroDesc||"", mobileAppsHeroImage||""]
    );
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/admin/dev/requests", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const type = req.query.type as string;
    let q = `SELECT id, service_type, answers, selected_service_card, submitted_at FROM dev_project_requests`;
    const params: any[] = [];
    if (type && ["websites","mobile_apps"].includes(type)) { q += ` WHERE service_type=$1`; params.push(type); }
    q += ` ORDER BY submitted_at DESC LIMIT 200`;
    const result = await pool.query(q, params);
    res.json(result.rows.map(r => ({
      id: r.id, serviceType: r.service_type, answers: r.answers,
      selectedServiceCard: r.selected_service_card, submittedAt: r.submitted_at,
    })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
