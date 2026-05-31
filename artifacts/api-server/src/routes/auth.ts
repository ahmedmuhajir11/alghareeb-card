import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const JWT_SECRET = process.env.SESSION_SECRET ?? "alghareeb-card-secret-key-2024";

// Build the API origin (used for OAuth callback). Relies on Express trust proxy
// setting to safely interpret x-forwarded-* headers.
function getApiOrigin(req: Request): string {
  const host = req.get("host") || "";
  const proto = req.protocol || "https";
  return `${proto}://${host}`;
}

// In production we always derive the callback URL from the current request,
// because stale GOOGLE_CALLBACK_URL env vars (e.g. pointing to dev domains)
// frequently break OAuth in deployed environments.
function getCallbackUrl(req: Request): string {
  if (process.env.NODE_ENV !== "production" && process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }
  return `${getApiOrigin(req)}/api/auth/google/callback`;
}

// Build the frontend origin used for post-login redirects. Defaults to the
// API origin (single-domain deployment). FRONTEND_URL only honored in dev
// to avoid stale values redirecting production users to the wrong host.
function getFrontendOrigin(req: Request): string {
  if (process.env.NODE_ENV !== "production" && process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, "");
  }
  return getApiOrigin(req);
}

const router: IRouter = Router();

function generateAccountNumber(id: number): string {
  return String(1000 + id).padStart(4, "0");
}

function mapUser(row: any) {
  return {
    id: row.id,
    accountNumber: row.account_number,
    name: row.name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    balance: parseFloat(row.balance || "0"),
    currency: row.currency || "TRY",
    level: row.level || "عادي",
    isVerified: row.is_verified,
    profileCompleted: row.profile_completed,
    avatarUrl: row.avatar_url || null,
    createdAt: row.created_at,
    isReseller: row.is_reseller || false,
    apiToken: row.api_token || null,
    allowedIps: row.allowed_ips || null,
  };
}

// Register with email + password
router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({ error: "الاسم والبريد الإلكتروني وكلمة السر مطلوبة" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "كلمة السر يجب أن تكون 6 أحرف على الأقل" });
    return;
  }
  try {
    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email.toLowerCase()]);
    if (exists.rows.length > 0) {
      res.status(409).json({ error: "البريد الإلكتروني مسجل مسبقاً" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (account_number, name, email, password_hash, profile_completed)
       VALUES ($1, $2, $3, $4, false) RETURNING *`,
      ["0000", name, email.toLowerCase(), passwordHash]
    );
    const user = result.rows[0];
    const accountNumber = generateAccountNumber(user.id);
    await pool.query("UPDATE users SET account_number=$1 WHERE id=$2", [accountNumber, user.id]);
    user.account_number = accountNumber;
    (req.session as any).userId = user.id;
    res.json({ success: true, user: mapUser(user) });
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في التسجيل: " + err.message });
  }
});

// Login with email + password
router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "البريد الإلكتروني وكلمة السر مطلوبان" });
    return;
  }
  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email.toLowerCase()]);
    if (result.rows.length === 0) {
      res.status(401).json({ error: "البريد الإلكتروني أو كلمة السر غير صحيحة" });
      return;
    }
    const user = result.rows[0];
    if (!user.password_hash) {
      res.status(401).json({ error: "هذا الحساب مسجل عبر جوجل. استخدم تسجيل الدخول بجوجل." });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "البريد الإلكتروني أو كلمة السر غير صحيحة" });
      return;
    }
    (req.session as any).userId = user.id;
    res.json({ success: true, user: mapUser(user) });
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في تسجيل الدخول" });
  }
});

// Update profile (country, phone, currency)
router.post("/auth/profile", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }
  const { country, phone, phoneCode, currency } = req.body ?? {};
  if (!country || !phone || !currency) {
    res.status(400).json({ error: "الدولة ورقم الهاتف والعملة مطلوبة" });
    return;
  }
  try {
    const existing = await pool.query("SELECT currency, profile_completed FROM users WHERE id=$1", [userId]);
    if (existing.rows.length === 0) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
    const prev = existing.rows[0];
    if (prev.profile_completed && prev.currency && prev.currency !== currency) {
      res.status(400).json({ error: "لا يمكن تغيير العملة بعد الحفظ" });
      return;
    }
    const result = await pool.query(
      `UPDATE users SET country=$1, phone=$2, phone_code=$3, currency=$4, profile_completed=true, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [country, phone, phoneCode || null, currency, userId]
    );
    res.json({ success: true, user: mapUser(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: "خطأ في حفظ الملف الشخصي" });
  }
});

// Logout
router.post("/auth/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.clearCookie("alghareeb.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    res.json({ success: true });
  });
});

// Me
router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.json({ user: null }); return; }
  try {
    const result = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
    if (result.rows.length === 0) { res.json({ user: null }); return; }
    res.json({ user: mapUser(result.rows[0]) });
  } catch {
    res.json({ user: null });
  }
});

// ── Google OAuth ──────────────────────────────────────────
// Step 1: Redirect user to Google
router.get("/auth/google", (req: Request, res: Response): void => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(503).send("Google OAuth is not configured yet.");
    return;
  }
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: getCallbackUrl(req),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Step 2: Handle Google callback
router.get("/auth/google/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, error } = req.query as { code?: string; error?: string };
  const FRONTEND_URL = getFrontendOrigin(req);
  if (error || !code) {
    res.redirect(`${FRONTEND_URL}/sign-in?error=google_cancelled`);
    return;
  }
  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: getCallbackUrl(req),
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json() as any;
    if (!tokens.access_token) throw new Error("No access token from Google");

    // Get user info from Google
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const gUser = await infoRes.json() as any;
    const { sub: googleId, email, name, picture } = gUser;
    if (!googleId || !email) throw new Error("Invalid Google user info");

    // Find or create user
    let userRow: any;
    const existing = await pool.query("SELECT * FROM users WHERE google_id=$1 OR email=$2 LIMIT 1", [googleId, email.toLowerCase()]);
    if (existing.rows.length > 0) {
      userRow = existing.rows[0];
      // Update google_id and avatar_url
      await pool.query(
        "UPDATE users SET google_id=COALESCE(google_id,$1), avatar_url=$2, updated_at=NOW() WHERE id=$3",
        [googleId, picture || userRow.avatar_url, userRow.id]
      );
      userRow.google_id = userRow.google_id || googleId;
      userRow.avatar_url = picture || userRow.avatar_url;
    } else {
      const ins = await pool.query(
        `INSERT INTO users (account_number, name, email, google_id, avatar_url, profile_completed) VALUES ($1,$2,$3,$4,$5,false) RETURNING *`,
        ["0000", name || email.split("@")[0], email.toLowerCase(), googleId, picture || null]
      );
      userRow = ins.rows[0];
      const accNum = generateAccountNumber(userRow.id);
      await pool.query("UPDATE users SET account_number=$1 WHERE id=$2", [accNum, userRow.id]);
      userRow.account_number = accNum;
    }

    (req.session as any).userId = userRow.id;
    const redirectPath = userRow.profile_completed ? "/" : "/profile-setup";
    // Generate short-lived JWT to pass auth cross-domain (Render → Vercel)
    const oauthToken = jwt.sign({ userId: userRow.id }, JWT_SECRET, { expiresIn: "5m" });
    req.session.save(() => {
      res.redirect(`${FRONTEND_URL}${redirectPath}?oauth_token=${oauthToken}`);
    });
  } catch (err: any) {
    console.error("Google OAuth error:", err.message);
    res.redirect(`${FRONTEND_URL}/sign-in?error=google_failed&detail=${encodeURIComponent(err.message || "")}`);
  }
});

// Exchange short-lived JWT for a real session (cross-domain OAuth fix)
router.post("/auth/exchange-token", async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body ?? {};
  if (!token) { res.status(400).json({ error: "token required" }); return; }
  let payload: { userId: number };
  try {
    payload = jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch (err: any) {
    console.error("exchange-token: jwt verify failed:", err?.message);
    res.status(401).json({ error: "invalid or expired token" });
    return;
  }
  try {
    const result = await pool.query("SELECT * FROM users WHERE id=$1", [payload.userId]);
    if (!result.rows[0]) {
      console.error("exchange-token: user not found", payload.userId);
      res.status(404).json({ error: "user not found" });
      return;
    }
    (req.session as any).userId = payload.userId;
    req.session.save((err) => {
      if (err) {
        console.error("exchange-token: session save failed:", err?.message, err);
        res.status(500).json({ error: "session error", detail: err?.message });
        return;
      }
      res.json({ user: mapUser(result.rows[0]) });
    });
  } catch (err: any) {
    console.error("exchange-token: unexpected error:", err?.message, err?.stack);
    res.status(500).json({ error: "exchange failed", detail: err?.message });
  }
});

export default router;
