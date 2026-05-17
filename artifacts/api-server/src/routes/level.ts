import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireUser } from "../middleware/requireUser";

const router: IRouter = Router();

type LevelDef = {
  key: string;
  nameAr: string;
  nameEn: string;
  emoji: string;
  minUsd: number;
  maxUsd: number | null;
  color: string;
};

const LEVELS: LevelDef[] = [
  { key: "bronze",   nameAr: "البرونزي",  nameEn: "Bronze",   emoji: "🥉", minUsd: 0,     maxUsd: 500,    color: "#cd7f32" },
  { key: "silver",   nameAr: "الفضي",     nameEn: "Silver",   emoji: "🥈", minUsd: 500,   maxUsd: 2000,   color: "#c0c0c0" },
  { key: "gold",     nameAr: "الذهبي",    nameEn: "Gold",     emoji: "🥇", minUsd: 2000,  maxUsd: 15000,  color: "#ffd700" },
  { key: "platinum", nameAr: "البلاتيني", nameEn: "Platinum", emoji: "💠", minUsd: 15000, maxUsd: 40000,  color: "#7ec0ee" },
  { key: "diamond",  nameAr: "الماسي",    nameEn: "Diamond",  emoji: "💎", minUsd: 40000, maxUsd: null,   color: "#b9f2ff" },
];

const RATE_KEYS: Record<string, string> = {
  USD: "USD",
  EUR: "usd_to_eur",
  TRY: "usd_to_try",
  SYP: "usd_to_syp",
  OMR: "usd_to_omr",
  MAD: "usd_to_mad",
  DZD: "usd_to_dzd",
  ILS: "usd_to_ils",
  IQD: "usd_to_iqd",
  SAR: "usd_to_sar",
};

router.get("/me/level", requireUser, async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).currentUser;
  try {
    const settingsRes = await pool.query("SELECT * FROM settings LIMIT 1");
    const settings = settingsRes.rows[0] || {};
    const userCurrency: string = user.currency || "USD";

    const userRateCol = RATE_KEYS[userCurrency];
    const userToUsdRate: number = userCurrency === "USD"
      ? 1
      : (parseFloat(settings[userRateCol]) || 1);

    const depRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM wallet_transactions WHERE user_id=$1 AND type='deposit'`,
      [user.id]
    );
    const totalDepositsUserCcy = parseFloat(depRes.rows[0].total) || 0;
    const totalDepositsUsd = userCurrency === "USD"
      ? totalDepositsUserCcy
      : totalDepositsUserCcy / userToUsdRate;

    let currentLevelIdx = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      const lv = LEVELS[i];
      if (totalDepositsUsd >= lv.minUsd && (lv.maxUsd === null || totalDepositsUsd < lv.maxUsd)) {
        currentLevelIdx = i;
        break;
      }
    }

    const currentLevel = LEVELS[currentLevelIdx];
    const nextLevel = LEVELS[currentLevelIdx + 1] ?? null;

    let progressToNext = 100;
    let amountToNextUsd = 0;
    if (nextLevel) {
      const span = nextLevel.minUsd - currentLevel.minUsd;
      const done = Math.max(0, totalDepositsUsd - currentLevel.minUsd);
      progressToNext = span > 0 ? Math.min(100, (done / span) * 100) : 100;
      amountToNextUsd = Math.max(0, nextLevel.minUsd - totalDepositsUsd);
    }

    const toUserCcy = (usd: number) =>
      userCurrency === "USD" ? usd : usd * userToUsdRate;

    const allLevels = LEVELS.map((lv, i) => ({
      key: lv.key,
      nameAr: lv.nameAr,
      nameEn: lv.nameEn,
      emoji: lv.emoji,
      color: lv.color,
      minUsd: lv.minUsd,
      maxUsd: lv.maxUsd,
      minUserCcy: toUserCcy(lv.minUsd),
      maxUserCcy: lv.maxUsd === null ? null : toUserCcy(lv.maxUsd),
      status: i < currentLevelIdx ? "achieved" : i === currentLevelIdx ? "current" : "locked",
    }));

    res.json({
      currency: userCurrency,
      totalDepositsUsd,
      totalDepositsUserCcy,
      currentLevel: {
        key: currentLevel.key,
        nameAr: currentLevel.nameAr,
        nameEn: currentLevel.nameEn,
        emoji: currentLevel.emoji,
        color: currentLevel.color,
      },
      nextLevel: nextLevel ? {
        key: nextLevel.key,
        nameAr: nextLevel.nameAr,
        nameEn: nextLevel.nameEn,
        emoji: nextLevel.emoji,
        minUsd: nextLevel.minUsd,
        minUserCcy: toUserCcy(nextLevel.minUsd),
      } : null,
      progressToNext,
      amountToNextUsd,
      amountToNextUserCcy: toUserCcy(amountToNextUsd),
      allLevels,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
