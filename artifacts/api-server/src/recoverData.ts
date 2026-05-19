import {
  db,
  sectionsTable,
  itemsTable,
  packagesTable,
  paymentMethodsTable,
  settingsTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./lib/logger";

const RECOVERY_SENTINEL_ITEM_ID = 17;
const RECOVERY_SENTINEL_NAME = "سو ماتش";

const SECTIONS = [
  { id: 1, nameAr: "شحن الألعاب الفوري", nameEn: "Instant Game Top-Up", sortOrder: 1, pricingType: "packages" },
  { id: 2, nameAr: "شحن التطبيقات الفوري", nameEn: "Instant App Top-Up", sortOrder: 2, pricingType: "per_quantity" },
  { id: 3, nameAr: "الحوالات المالية", nameEn: "Money Transfers", sortOrder: 3, pricingType: "per_quantity" },
  { id: 4, nameAr: "سحب رواتب المضيفين", nameEn: "Host Salary Withdrawal", sortOrder: 4, pricingType: "per_quantity" },
  { id: 5, nameAr: "تعبئة الرصيد", nameEn: "Credit Recharge", sortOrder: 5, pricingType: "packages" },
  { id: 6, nameAr: "طرق الدفع والإيداع", nameEn: "Payment Methods", sortOrder: 6, pricingType: "per_quantity" },
];

const ITEMS = [
  { id: 1,  sectionId: 1, nameAr: "ببجي موبايل",        nameEn: "PUBG Mobile",       minQuantity: 60,  sortOrder: 1, isActive: true,  currencyUnit: null,      pricePerUnit: null },
  { id: 2,  sectionId: 1, nameAr: "فري فاير",            nameEn: "Free Fire",         minQuantity: 100, sortOrder: 2, isActive: true,  currencyUnit: null,      pricePerUnit: null },
  { id: 3,  sectionId: 1, nameAr: "كلاش أوف كلانس",      nameEn: "Clash of Clans",    minQuantity: 80,  sortOrder: 3, isActive: true,  currencyUnit: null,      pricePerUnit: null },
  { id: 4,  sectionId: 1, nameAr: "ليغ أوف ليجندز",      nameEn: "League of Legends", minQuantity: 500, sortOrder: 4, isActive: true,  currencyUnit: null,      pricePerUnit: null },
  { id: 10, sectionId: 2, nameAr: "بارتي ستار",          nameEn: "party star",        minQuantity: 1,   sortOrder: 1, isActive: true,  currencyUnit: "ماسات",   pricePerUnit: 0.0011236 },
  { id: 11, sectionId: 2, nameAr: "سول ستار",            nameEn: "Soul Star",         minQuantity: 1,   sortOrder: 2, isActive: true,  currencyUnit: "كوينز",   pricePerUnit: 0.000128575 },
  { id: 5,  sectionId: 2, nameAr: "بيغو لايف",           nameEn: "BIGO LIVE",         minQuantity: 1,   sortOrder: 3, isActive: true,  currencyUnit: "ماسات",   pricePerUnit: 0.0186 },
  { id: 6,  sectionId: 2, nameAr: "واهو شات",            nameEn: "WAHO CHAT",         minQuantity: 1,   sortOrder: 4, isActive: true,  currencyUnit: "كوينز",   pricePerUnit: 9496.67616334283 },
  { id: 7,  sectionId: 2, nameAr: "يويو شات",            nameEn: "YOYO CHAT",         minQuantity: 1,   sortOrder: 5, isActive: true,  currencyUnit: "كوينز",   pricePerUnit: 0.00079828 },
  { id: 17, sectionId: 2, nameAr: "سو ماتش",             nameEn: "SoMatch",           minQuantity: 1,   sortOrder: 6, isActive: true,  currencyUnit: "كوينز",   pricePerUnit: 0.000129870129870129 },
  { id: 13, sectionId: 2, nameAr: "سول شيل",             nameEn: "SOULCHIIL",         minQuantity: 1,   sortOrder: 6, isActive: true,  currencyUnit: "ماسات",   pricePerUnit: 0.00188452 },
  { id: 8,  sectionId: 3, nameAr: "تحويل بنكي",          nameEn: "Bank Transfer",     minQuantity: 1,   sortOrder: 1, isActive: true,  currencyUnit: null,      pricePerUnit: null },
  { id: 9,  sectionId: 3, nameAr: "تحويل ويسترن يونيون", nameEn: "Western Union",     minQuantity: 1,   sortOrder: 2, isActive: true,  currencyUnit: null,      pricePerUnit: null },
  { id: 14, sectionId: 5, nameAr: "رصيد سيرياتيل",       nameEn: "Syriatel Balance",  minQuantity: 1,   sortOrder: 0, isActive: true,  currencyUnit: null,      pricePerUnit: null },
  { id: 15, sectionId: 5, nameAr: "رصيد ام تي ان",       nameEn: "MTN Balance",       minQuantity: 1,   sortOrder: 0, isActive: true,  currencyUnit: null,      pricePerUnit: null },
  { id: 12, sectionId: 5, nameAr: "تركسل",               nameEn: "TURKCELL",          minQuantity: 1,   sortOrder: 1, isActive: true,  currencyUnit: null,      pricePerUnit: null },
  { id: 16, sectionId: 5, nameAr: "رصيد اسياسيل",        nameEn: "Asiacell Balance",  minQuantity: 1,   sortOrder: 4, isActive: true,  currencyUnit: null,      pricePerUnit: null },
];

const PACKAGES = [
  { id: 1,  itemId: 1,  label: "60 UC",   quantity: 60,   priceUsd: 0.945,  sortOrder: 1 },
  { id: 2,  itemId: 1,  label: "325 UC",  quantity: 325,  priceUsd: 4.651,  sortOrder: 2 },
  { id: 3,  itemId: 1,  label: "660 UC",  quantity: 660,  priceUsd: 9.282,  sortOrder: 3 },
  { id: 4,  itemId: 1,  label: "1800 UC", quantity: 1800, priceUsd: 23.195, sortOrder: 4 },
  { id: 5,  itemId: 1,  label: "1500 UC", quantity: 1500, priceUsd: 24.99,  sortOrder: 5 },
  { id: 6,  itemId: 1,  label: "3850 UC", quantity: 3850, priceUsd: 46.379, sortOrder: 6 },
  { id: 24, itemId: 1,  label: "8100 UC", quantity: 8100, priceUsd: 92.201, sortOrder: 7 },
  { id: 7,  itemId: 2,  label: "100 جوهرة",  quantity: 100,  priceUsd: 0.99,  sortOrder: 1 },
  { id: 8,  itemId: 2,  label: "310 جوهرة",  quantity: 310,  priceUsd: 2.99,  sortOrder: 2 },
  { id: 9,  itemId: 2,  label: "520 جوهرة",  quantity: 520,  priceUsd: 4.99,  sortOrder: 3 },
  { id: 10, itemId: 2,  label: "1060 جوهرة", quantity: 1060, priceUsd: 9.99,  sortOrder: 4 },
  { id: 11, itemId: 2,  label: "2180 جوهرة", quantity: 2180, priceUsd: 19.99, sortOrder: 5 },
  { id: 12, itemId: 2,  label: "5600 جوهرة", quantity: 5600, priceUsd: 49.99, sortOrder: 6 },
  { id: 20, itemId: 8,  label: "10 دولار",   quantity: 10,   priceUsd: 10.5,  sortOrder: 1 },
  { id: 21, itemId: 8,  label: "25 دولار",   quantity: 25,   priceUsd: 26.25, sortOrder: 2 },
  { id: 22, itemId: 8,  label: "50 دولار",   quantity: 50,   priceUsd: 52.5,  sortOrder: 3 },
  { id: 23, itemId: 8,  label: "100 دولار",  quantity: 100,  priceUsd: 105,   sortOrder: 4 },
  { id: 25, itemId: 12, label: "رصيد ليرات 250",  quantity: 250,  priceUsd: 6.037,  sortOrder: 1 },
  { id: 26, itemId: 12, label: "رصيد ليرات 400",  quantity: 400,  priceUsd: 9.66,   sortOrder: 2 },
  { id: 27, itemId: 12, label: "رصيد ليرات 500",  quantity: 500,  priceUsd: 12.075, sortOrder: 3 },
  { id: 28, itemId: 12, label: "رصيد ليرات 750",  quantity: 750,  priceUsd: 18.112, sortOrder: 4 },
  { id: 60, itemId: 12, label: "رصيد ليرات 1000", quantity: 1000, priceUsd: 24.15,  sortOrder: 5 },
  { id: 13, itemId: 14, label: "باقة ليرات",  quantity: 951,    priceUsd: 9, sortOrder: 1 },
  { id: 14, itemId: 15, label: "وحدات",       quantity: 700,    priceUsd: 7, sortOrder: 3 },
  { id: 15, itemId: 16, label: "اختر الباقة", quantity: 120000, priceUsd: 9, sortOrder: 0 },
];

const PAYMENT_METHODS = [
  {
    id: 1, nameAr: "الإيداع من تركيا", nameEn: "Deposit from Turkey", flagEmoji: "🇹🇷",
    fields: [
      { label: "IBAN", value: "TR55 0001 0004 2486 7092 6450 05", isCopyable: true },
      { label: "الاسم", value: "AHMED MÜHACER", isCopyable: true },
    ],
    qrImageUrl: null,
    notes: [
      "ممنوع التحويل من طرف ثالث",
      "الحد الأدنى للإيداع: 520 ليرة تركية 🇹🇷",
      "قد يستغرق إيداع الرصيد في الحساب ما بين 1 و20 دقيقة",
    ],
    isActive: true, sortOrder: 1,
  },
  {
    id: 2, nameAr: "الإيداع من سوريا (شام كاش)", nameEn: "Deposit from Syria (Sham Cash)", flagEmoji: "🇸🇾",
    fields: [
      { label: "عنوان المحفظة", value: "6d0e9766888ac55194cc5ce98f259fa2", isCopyable: true },
      { label: "الاسم", value: "احمد مهاجري", isCopyable: true },
    ],
    qrImageUrl: "/qr/shamcash.jpg",
    notes: [
      "الحد الأدنى للإيداع: 10 دولار أو 1000 ليرة سوري",
      "قد يستغرق إيداع الرصيد في الحساب ما بين 1 و20 دقيقة",
    ],
    isActive: true, sortOrder: 2,
  },
  {
    id: 3, nameAr: "الإيداع من الأردن", nameEn: "Deposit from Jordan", flagEmoji: "🇯🇴",
    fields: [
      { label: "اسم البنك", value: "البنك العربي الإسلامي", isCopyable: true },
      { label: "الاسم المستعار", value: "JOPAY911", isCopyable: true },
    ],
    qrImageUrl: null,
    notes: [
      "التحويل من شخص موثوق حصراً",
      "الحد الأدنى للإيداع: 20 دينار",
      "الحد الأقصى للإيداع: 150 دينار",
      "قد يستغرق إيداع الرصيد في الحساب ما بين 1 إلى 60 دقيقة",
    ],
    isActive: true, sortOrder: 3,
  },
  {
    id: 7, nameAr: "الإيداع من مصر ", nameEn: "Deposit from Egypt", flagEmoji: "🇪🇬",
    fields: [
      { label: "فودافون كاش ", value: "VODAFONE CASH ", isCopyable: false },
      { label: "رمز المحفظة", value: "01515125845", isCopyable: true },
    ],
    qrImageUrl: null,
    notes: [
      "الحد الأدنى للإيداع: 100 جنيه مصري",
      "تستغرق عملية إيداع الرصيد من 1 إلى 20 دقيقة",
      "يرجى رفع صورة إشعار الحوالة على الواتساب.",
      "لن يتم قبول صور رسائل SMS كإشعار للتحويل",
    ],
    isActive: true, sortOrder: 4,
  },
  {
    id: 4, nameAr: "الإيداع من لبنان", nameEn: "Deposit from Lebanon", flagEmoji: "🇱🇧",
    fields: [
      { label: "اسم الخدمة", value: "WHISH MONEY", isCopyable: true },
      { label: "رقم الويش", value: "79492889", isCopyable: true },
    ],
    qrImageUrl: null,
    notes: [
      "الحد الأدنى للإيداع: 10 دولار 💵",
      "الضريبة: 1%",
      "يستغرق إيداع الرصيد في الحساب ما بين 1 و20 دقيقة",
    ],
    isActive: true, sortOrder: 4,
  },
  {
    id: 5, nameAr: "الإيداع من أوروبا", nameEn: "Deposit from Europe", flagEmoji: "🇪🇺",
    fields: [
      { label: "اسم صاحب الحساب", value: "Muhammed Fahed Kabbani", isCopyable: true },
      { label: "IBAN", value: "LT053500010018346329", isCopyable: true },
    ],
    qrImageUrl: null,
    notes: [
      "مطلوب كتابة اسم المرسل بالكامل",
      "الحد الأدنى للإيداع: 50 يورو",
      "يرجى تحويل الأموال باختيار التحويل السريع، وإلا سيتم الانتظار حتى وصول الحوالة",
    ],
    isActive: true, sortOrder: 5,
  },
  {
    id: 6, nameAr: "الإيداع العالمي (USDT)", nameEn: "Global Deposit (USDT)", flagEmoji: "🌍",
    fields: [
      { label: "نوع الشبكة", value: "Tron (TRC20)", isCopyable: false },
      { label: "عنوان المحفظة", value: "TXb6R7fJrsoKk3cdnPaZ3xkH9a3vRudVhf", isCopyable: true },
    ],
    qrImageUrl: "/qr/usdt.png",
    notes: [
      "الخدمة تعمل بشكل يدوي 7/24",
      "الحد الأدنى للإيداع: 10 دولار 💵",
      "هناك عمولة 0.10 سنت على العملية",
    ],
    isActive: true, sortOrder: 6,
  },
  {
    id: 8, nameAr: "حوالة شخصية", nameEn: "Personal transfer", flagEmoji: "💵",
    fields: [
      { label: "اسم المستفيد", value: "احمد مهاجري", isCopyable: true },
      { label: "اسم المكتب", value: "الكيان", isCopyable: true },
      { label: "العنوان", value: "تركيا – إزميت – غولجوك", isCopyable: true },
      { label: "العنوان بالتركي", value: "Türkiye – İzmit – Gölcük", isCopyable: true },
      { label: "عملات الاستلام", value: "الدولار– اليورو – الليرة التركية", isCopyable: true },
    ],
    qrImageUrl: null,
    notes: [
      "يمكنكم إرسال الحوالات عبر الشركات التالية: الوفاء – ذهب – أونلاين – تواصل – السفير – شمس – العالمية – الخواجة – الكرم – اليقين – أوسكار – جودي ",
      "بعد استلام الحوالة والتأكد من صحتها، يتم شحن التطبيقات أو الألعاب إلى حسابكم. تتراوح مدة تنفيذ العملية بين 1 إلى 60 دقيقة كحد أقصى، وذلك في حال عدم وجود أي خطأ في بيانات الحوالة.",
    ],
    isActive: true, sortOrder: 7,
  },
  {
    id: 10, nameAr: "الإيداع من العراق", nameEn: "Deposit from iraq", flagEmoji: "🇮🇶",
    fields: [
      { label: "زين كاش ", value: "07781379544", isCopyable: true },
      { label: "تعليمات التحويل", value: "يرجى التحويل إلى الرقم أعلاه فقط لغرض الشحن مع كتابة الملاحظة التالية داخل التحويل", isCopyable: false },
      { label: "ضع هذا النص في الملاحظة", value: "أقوم بالتحويل بكامل إرادتي إلى (YC ) لغرض شحن البرامج والألعاب", isCopyable: true },
    ],
    qrImageUrl: null,
    notes: [
      "في حال عدم كتابة الملاحظة بشكل صحيح سيتم رفض الإيداع",
      "يرجى التأكد من كتابة المبلغ بشكل واضح لتجنب تأخير عملية الشحن",
    ],
    isActive: true, sortOrder: 8,
  },
  {
    id: 9, nameAr: "الدفع عبر باي بال", nameEn: "PayPal Payment", flagEmoji: "🇺🇸",
    fields: [
      { label: "رابط الدفع", value: "https://paypal.me/ahmedmuhajir", isCopyable: true },
      { label: "البريد الالكتروني ", value: "ahmed.muhajir11@gmail.com", isCopyable: true },
    ],
    qrImageUrl: null,
    notes: [
      "الضريبة: 7%",
      "الحد الأدنى للإيداع: 100 دولار",
      "مدة إيداع الرصيد في الحساب: من 1 إلى 20 دقيقة",
    ],
    isActive: true, sortOrder: 9,
  },
];

export async function recoverDataIfNeeded(): Promise<void> {
  logger.info("Data recovery permanently disabled — skipping");
  return;

  for (const s of SECTIONS) {
    await db
      .insert(sectionsTable)
      .values(s)
      .onConflictDoUpdate({
        target: sectionsTable.id,
        set: {
          nameAr: s.nameAr,
          nameEn: s.nameEn,
          sortOrder: s.sortOrder,
          pricingType: s.pricingType,
        },
      });
  }

  for (const it of ITEMS) {
    await db
      .insert(itemsTable)
      .values(it)
      .onConflictDoUpdate({
        target: itemsTable.id,
        set: {
          sectionId: it.sectionId,
          nameAr: it.nameAr,
          nameEn: it.nameEn,
          minQuantity: it.minQuantity,
          sortOrder: it.sortOrder,
          isActive: it.isActive,
          currencyUnit: it.currencyUnit,
          pricePerUnit: it.pricePerUnit,
        },
      });
  }

  for (const p of PACKAGES) {
    await db
      .insert(packagesTable)
      .values(p)
      .onConflictDoUpdate({
        target: packagesTable.id,
        set: {
          itemId: p.itemId,
          label: p.label,
          quantity: p.quantity,
          priceUsd: p.priceUsd,
          sortOrder: p.sortOrder,
        },
      });
  }

  for (const pm of PAYMENT_METHODS) {
    await db
      .insert(paymentMethodsTable)
      .values(pm)
      .onConflictDoUpdate({
        target: paymentMethodsTable.id,
        set: {
          nameAr: pm.nameAr,
          nameEn: pm.nameEn,
          flagEmoji: pm.flagEmoji,
          fields: pm.fields,
          qrImageUrl: pm.qrImageUrl,
          notes: pm.notes,
          isActive: pm.isActive,
          sortOrder: pm.sortOrder,
        },
      });
  }

  await db.execute(sql`SELECT setval(pg_get_serial_sequence('sections', 'id'), GREATEST((SELECT MAX(id) FROM sections), 1))`);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('items', 'id'), GREATEST((SELECT MAX(id) FROM items), 1))`);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('packages', 'id'), GREATEST((SELECT MAX(id) FROM packages), 1))`);
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('payment_methods', 'id'), GREATEST((SELECT MAX(id) FROM payment_methods), 1))`);

  logger.info({
    sections: SECTIONS.length,
    items: ITEMS.length,
    packages: PACKAGES.length,
    paymentMethods: PAYMENT_METHODS.length,
  }, "Data recovery completed successfully");
}

const ITEM_LOGOS: Array<{ id: number; logoUrl: string }> = [
  { id: 10, logoUrl: "/api/uploads/upload-1775564408154-893141119.jpg" },
  { id: 11, logoUrl: "/api/uploads/upload-1775566807524-441856185.png" },
  { id: 12, logoUrl: "/api/uploads/upload-1775568038524-262602966.jpg" },
];

export async function ensureItemLogos(): Promise<void> {
  let updated = 0;
  for (const { id, logoUrl } of ITEM_LOGOS) {
    const result = await db
      .update(itemsTable)
      .set({ logoUrl })
      .where(sql`${itemsTable.id} = ${id} AND (${itemsTable.logoUrl} IS NULL OR ${itemsTable.logoUrl} = '')`)
      .returning({ id: itemsTable.id });
    if (result.length > 0) updated += 1;
  }
  if (updated > 0) {
    logger.info({ updated }, "Restored missing item logos");
  }
}
