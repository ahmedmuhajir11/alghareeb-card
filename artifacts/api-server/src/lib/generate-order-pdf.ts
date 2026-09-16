import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

// NOTE on paths: this module is bundled by esbuild into a single
// dist/index.mjs file, so `import.meta.url` at runtime always points to
// that bundled file's location on disk (artifacts/api-server/dist/).
// We resolve sibling asset folders relative to THAT location, exactly
// like app.ts already does for the frontend's built static folder.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONT_PATH = path.resolve(__dirname, "../src/assets/fonts/Cairo-Regular.ttf");
const LOGO_PATH = path.resolve(__dirname, "../../alghareeb-card/dist/public/logo.png");

function fileToDataUri(filePath: string, mime: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface OrderPdfData {
  orderId: number;
  itemNameAr: string;
  itemNameEn: string | null;
  packageName: string | null;
  targetId: string | null;
  providerUsername: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
}

const STATUS_LABEL_AR: Record<string, string> = {
  completed: "مكتمل",
  pending: "قيد المعالجة",
  rejected: "مرفوض",
  approved: "تمت الموافقة",
  cancelled: "ملغي",
};

function formatDate(d: Date): string {
  try {
    return d.toLocaleString("ar-EG", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}

function buildHtml(data: OrderPdfData): string {
  const fontDataUri = fileToDataUri(FONT_PATH, "font/ttf");
  const logoDataUri = fileToDataUri(LOGO_PATH, "image/png");

  const isSuccess = data.status === "completed";
  const isPending = data.status === "pending";
  const bannerColor = isSuccess ? "#059669" : isPending ? "#CA8A04" : "#DC2626";
  const bannerText = isSuccess ? "تم الشحن بنجاح ✓" : isPending ? "الطلب قيد المعالجة" : "فشلت العملية";

  const productLine = escapeHtml(data.itemNameEn || data.itemNameAr);

  const rows: string[] = [];
  rows.push(row("المنتج", productLine + (data.packageName ? ` — ${escapeHtml(data.packageName)}` : "")));
  rows.push(row("المبلغ", `${data.amount.toFixed(2)} ${escapeHtml(data.currency)}`, true));
  rows.push(row("رقم الطلب", `#${data.orderId}`, true));
  rows.push(row("التاريخ", formatDate(data.createdAt)));
  rows.push(row("الحالة", STATUS_LABEL_AR[data.status] || data.status));
  if (data.targetId) rows.push(row("Player ID / Target ID", escapeHtml(data.targetId), true));
  if (data.providerUsername) rows.push(row("اسم الحساب", escapeHtml(data.providerUsername)));

  function row(label: string, value: string, ltr = false): string {
    return `<div class="row"><span class="label">${label}</span><span class="value${ltr ? " ltr" : ""}">${value}</span></div>`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Cairo';
    src: ${fontDataUri ? `url('${fontDataUri}') format('truetype')` : "local('Arial')"};
    font-weight: 200 900;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Cairo', 'Arial', sans-serif; color:#1F1533; background:#fff; }
  .header { background: linear-gradient(135deg, #5B21B6, #8B3DFF 55%, #FABE23); padding: 34px 20px 28px; text-align:center; color:#fff; }
  .header img { width:56px; height:56px; border-radius:14px; margin-bottom:10px; display:block; margin-left:auto; margin-right:auto; }
  .header h1 { font-size:26px; font-weight:900; }
  .header p { font-size:14px; color:#F3E8FF; margin-top:6px; }
  .banner { margin: 26px 40px 0; padding:14px; border-radius:10px; text-align:center; font-weight:800; font-size:16px; color:#fff; background:${bannerColor}; }
  .card { margin: 26px 40px; border:1px solid #E4D9FF; background:#FBF8FF; border-radius:14px; overflow:hidden; }
  .row { display:flex; justify-content:space-between; align-items:center; padding:15px 22px; border-bottom:1px solid #ECE3FF; font-size:14px; }
  .row:last-child { border-bottom:none; }
  .label { color:#6B6480; font-weight:700; }
  .value { color:#1F1533; font-weight:800; text-align:left; }
  .value.ltr { direction:ltr; font-family: 'Courier New', monospace; }
  .footer { text-align:center; color:#9C93B5; font-size:11px; margin-top:50px; line-height:1.8; }
</style>
</head>
<body>
  <div class="header">
    ${logoDataUri ? `<img src="${logoDataUri}" />` : ""}
    <h1>الغريب كارد</h1>
    <p>إثبات الدفع</p>
  </div>
  <div class="banner">${bannerText}</div>
  <div class="card">
    ${rows.join("\n    ")}
  </div>
  <div class="footer">
    <p>هذا المستند تم إصداره تلقائياً من نظام الغريب كارد ولا يحتاج توقيع أو ختم.</p>
    <p>تم الإصدار في: ${formatDate(new Date())}</p>
  </div>
</body>
</html>`;
}

let sharedBrowserPromise: ReturnType<typeof puppeteer.launch> | null = null;
async function getBrowser() {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = puppeteer.launch({
      headless: true,
      executablePath: "/snap/bin/chromium",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }
  return sharedBrowserPromise;
}

/**
 * Renders a professional proof-of-payment PDF and writes the resulting
 * bytes to the given writable stream (typically an Express response).
 * Caller is fully responsible for verifying the order belongs to the
 * requesting user AND that its status is the confirmed success state
 * BEFORE calling this function — this function only renders, it does
 * not authorize.
 */
export async function streamOrderProofPdf(data: OrderPdfData, dest: NodeJS.WritableStream & { write: Function; end: Function }): Promise<void> {
  const html = buildHtml(data);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
    dest.write(pdfBuffer);
    dest.end();
  } finally {
    await page.close();
  }
}
