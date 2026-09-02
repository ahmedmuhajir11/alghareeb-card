import { db, sectionsTable, itemsTable, packagesTable, paymentMethodsTable, settingsTable } from "@workspace/db";
import { count } from "drizzle-orm";

export async function ensureCriticalSections() {
  await db.insert(sectionsTable).values([
    { id: 1, nameAr: "شحن الألعاب", nameEn: "Game Top-Up", sortOrder: 1, pricingType: "packages" },
    { id: 2, nameAr: "شحن التطبيقات", nameEn: "App Top-Up", sortOrder: 2, pricingType: "per_quantity" },
    { id: 3, nameAr: "الحوالات المالية", nameEn: "Money Transfers", sortOrder: 3, pricingType: "per_quantity" },
    { id: 4, nameAr: "سحب رواتب المضيفين", nameEn: "Host Salary Withdrawal", sortOrder: 6, pricingType: "per_quantity" },
    { id: 5, nameAr: "تعبئة الرصيد", nameEn: "Credit Recharge", sortOrder: 7, pricingType: "packages" },
    { id: 6, nameAr: "طرق الدفع والإيداع", nameEn: "Payment Methods", sortOrder: 8, pricingType: "per_quantity" },
    { id: 7, nameAr: "تصميم وبرمجة تطبيقات الجوال", nameEn: "Mobile Apps Design & Dev", nameTr: "Mobil Uygulama Geliştirme", sortOrder: 4, pricingType: "packages", logoUrl: "/section-apps-dev.jpg" },
    { id: 8, nameAr: "تصميم وبرمجة مواقع الويب", nameEn: "Websites Design & Dev", nameTr: "Web Sitesi Geliştirme", sortOrder: 5, pricingType: "packages", logoUrl: "/section-web-dev.jpg" },
  ]).onConflictDoNothing();

  // Update existing sections in database to ensure proper names and card images
  try {
    const { pool } = await import("@workspace/db");
    
    // 1. Update the empty duplicate section (or section 7) to Mobile Apps
    await pool.query(`
      UPDATE sections 
      SET name_ar = 'تصميم وبرمجة تطبيقات الجوال',
          name_en = 'Mobile Apps Design & Dev',
          name_tr = 'Mobil Uygulama Geliştirme',
          logo_url = '/section-apps-dev.jpg',
          sort_order = 4
      WHERE id = 7 OR (name_ar = 'شحن التطبيقات' AND id NOT IN (1, 2, 3, 4, 5, 6)) OR name_ar = 'التصميم والبرمجة';
    `);

    // 2. Ensure Websites section exists or update section 8
    await pool.query(`
      INSERT INTO sections (id, name_ar, name_en, name_tr, logo_url, pricing_type, sort_order)
      VALUES (8, 'تصميم وبرمجة مواقع الويب', 'Websites Design & Dev', 'Web Sitesi Geliştirme', '/section-web-dev.jpg', 'packages', 5)
      ON CONFLICT (id) DO UPDATE 
      SET name_ar = 'تصميم وبرمجة مواقع الويب',
          name_en = 'Websites Design & Dev',
          name_tr = 'Web Sitesi Geliştirme',
          logo_url = '/section-web-dev.jpg',
          sort_order = 5;
    `);

    // 3. Ensure other sort orders
    await pool.query(`UPDATE sections SET sort_order = 6 WHERE id = 4;`);
    await pool.query(`UPDATE sections SET sort_order = 7 WHERE id = 5;`);
    await pool.query(`UPDATE sections SET sort_order = 8 WHERE id = 6;`);
  } catch (e) {
    // ignore
  }
}

export async function seedIfEmpty() {
  const [{ value: sectionCount }] = await db.select({ value: count() }).from(sectionsTable);
  if (Number(sectionCount) > 0) return;

  await db.insert(settingsTable).values({
    id: 1,
    marqueeText: "أقوى العروض والتخفيضات اليومية مستمرة على مدار الساعة 🔥 اشحن بسرعة وأمان مع الغريب كارد",
    usdToTry: 45,
    usdToSyp: 13000,
    usdToEur: 46,
    whatsappNumber: "00905378221375",
  }).onConflictDoNothing();

  await db.insert(sectionsTable).values([
    { id: 1, nameAr: "شحن الألعاب", nameEn: "Game Top-Up", sortOrder: 1, pricingType: "packages" },
    { id: 2, nameAr: "شحن التطبيقات", nameEn: "App Top-Up", sortOrder: 2, pricingType: "per_quantity" },
    { id: 3, nameAr: "الحوالات المالية", nameEn: "Money Transfers", sortOrder: 3, pricingType: "per_quantity" },
    { id: 4, nameAr: "سحب رواتب المضيفين", nameEn: "Host Salary Withdrawal", sortOrder: 4, pricingType: "per_quantity" },
    { id: 5, nameAr: "تعبئة الرصيد", nameEn: "Credit Recharge", sortOrder: 5, pricingType: "packages" },
    { id: 6, nameAr: "طرق الدفع والإيداع", nameEn: "Payment Methods", sortOrder: 6, pricingType: "per_quantity" },
  ]).onConflictDoNothing().returning();

  await db.insert(itemsTable).values([
    { id: 1, sectionId: 1, nameAr: "ببجي موبايل", nameEn: "PUBG Mobile", minQuantity: 60, sortOrder: 1, isActive: true },
    { id: 2, sectionId: 1, nameAr: "فري فاير", nameEn: "Free Fire", minQuantity: 100, sortOrder: 2, isActive: true },
    { id: 3, sectionId: 1, nameAr: "كلاش أوف كلانس", nameEn: "Clash of Clans", minQuantity: 80, sortOrder: 3, isActive: true },
    { id: 4, sectionId: 1, nameAr: "ليغ أوف ليجندز", nameEn: "League of Legends", minQuantity: 500, sortOrder: 4, isActive: true },
    { id: 8, sectionId: 3, nameAr: "تحويل بنكي", nameEn: "Bank Transfer", minQuantity: 1, sortOrder: 1, isActive: true },
    { id: 9, sectionId: 3, nameAr: "تحويل ويسترن يونيون", nameEn: "Western Union", minQuantity: 1, sortOrder: 2, isActive: true },
    { id: 10, sectionId: 2, nameAr: "بارتي ستار", nameEn: "party star", minQuantity: 1, sortOrder: 1, isActive: true, currencyUnit: "ماسات", pricePerUnit: 0.00111 },
    { id: 11, sectionId: 2, nameAr: "سول ستار", nameEn: "Soul Star", minQuantity: 1, sortOrder: 2, isActive: true, currencyUnit: "كوينز", pricePerUnit: 0.00011277 },
    { id: 12, sectionId: 5, nameAr: "تركسل", nameEn: "TURKCELL", minQuantity: 1, sortOrder: 1, isActive: true },
  ]).onConflictDoNothing();

  await db.insert(packagesTable).values([
    { id: 1, itemId: 1, label: "60 UC", quantity: 60, priceUsd: 0.945, sortOrder: 1 },
    { id: 2, itemId: 1, label: "325 UC", quantity: 325, priceUsd: 4.651, sortOrder: 2 },
    { id: 3, itemId: 1, label: "660 UC", quantity: 660, priceUsd: 9.282, sortOrder: 3 },
    { id: 4, itemId: 1, label: "1800 UC", quantity: 1800, priceUsd: 23.195, sortOrder: 4 },
    { id: 5, itemId: 1, label: "1500 UC", quantity: 1500, priceUsd: 24.99, sortOrder: 5 },
    { id: 6, itemId: 1, label: "3850 UC", quantity: 3850, priceUsd: 46.379, sortOrder: 6 },
    { id: 24, itemId: 1, label: "8100 UC", quantity: 8100, priceUsd: 92.201, sortOrder: 7 },
    { id: 7, itemId: 2, label: "100 جوهرة", quantity: 100, priceUsd: 0.99, sortOrder: 1 },
    { id: 8, itemId: 2, label: "310 جوهرة", quantity: 310, priceUsd: 2.99, sortOrder: 2 },
    { id: 9, itemId: 2, label: "520 جوهرة", quantity: 520, priceUsd: 4.99, sortOrder: 3 },
    { id: 10, itemId: 2, label: "1060 جوهرة", quantity: 1060, priceUsd: 9.99, sortOrder: 4 },
    { id: 11, itemId: 2, label: "2180 جوهرة", quantity: 2180, priceUsd: 19.99, sortOrder: 5 },
    { id: 12, itemId: 2, label: "5600 جوهرة", quantity: 5600, priceUsd: 49.99, sortOrder: 6 },
    { id: 20, itemId: 8, label: "10 دولار", quantity: 10, priceUsd: 10.5, sortOrder: 1 },
    { id: 21, itemId: 8, label: "25 دولار", quantity: 25, priceUsd: 26.25, sortOrder: 2 },
    { id: 22, itemId: 8, label: "50 دولار", quantity: 50, priceUsd: 52.5, sortOrder: 3 },
    { id: 23, itemId: 8, label: "100 دولار", quantity: 100, priceUsd: 105, sortOrder: 4 },
    { id: 25, itemId: 12, label: "رصيد ليرات 250", quantity: 250, priceUsd: 6.037, sortOrder: 1 },
    { id: 26, itemId: 12, label: "رصيد ليرات 400", quantity: 400, priceUsd: 9.66, sortOrder: 2 },
    { id: 27, itemId: 12, label: "رصيد ليرات 500", quantity: 500, priceUsd: 12.075, sortOrder: 3 },
    { id: 28, itemId: 12, label: "رصيد ليرات 750", quantity: 750, priceUsd: 18.112, sortOrder: 4 },
    { id: 60, itemId: 12, label: "رصيد ليرات 1000", quantity: 1000, priceUsd: 24.15, sortOrder: 5 },
  ]).onConflictDoNothing();

  await db.insert(paymentMethodsTable).values([
    {
      id: 1,
      nameAr: "الإيداع من تركيا",
      nameEn: "Deposit from Turkey",
      flagEmoji: "🇹🇷",
      fields: [
        { label: "IBAN", value: "TR55 0001 0004 2486 7092 6450 05", isCopyable: true },
        { label: "الاسم", value: "AHMED MÜHACER", isCopyable: true },
      ],
      notes: [
        "ممنوع التحويل من طرف ثالث",
        "الحد الأدنى للإيداع: 520 ليرة تركية 🇹🇷",
        "قد يستغرق إيداع الرصيد في الحساب ما بين 1 و20 دقيقة",
      ],
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 2,
      nameAr: "الإيداع من سوريا (شام كاش)",
      nameEn: "Deposit from Syria (Sham Cash)",
      flagEmoji: "🇸🇾",
      fields: [
        { label: "عنوان المحفظة", value: "6d0e9766888ac55194cc5ce98f259fa2", isCopyable: true },
        { label: "الاسم", value: "احمد مهاجري", isCopyable: true },
      ],
      qrImageUrl: "/qr/shamcash.jpg",
      notes: [
        "الحد الأدنى للإيداع: 10 دولار أو 1000 ليرة سوري",
        "قد يستغرق إيداع الرصيد في الحساب ما بين 1 و20 دقيقة",
      ],
      isActive: true,
      sortOrder: 2,
    },
    {
      id: 3,
      nameAr: "الإيداع من الأردن",
      nameEn: "Deposit from Jordan",
      flagEmoji: "🇯🇴",
      fields: [
        { label: "اسم البنك", value: "البنك العربي الإسلامي", isCopyable: true },
        { label: "الاسم المستعار", value: "JOPAY911", isCopyable: true },
      ],
      notes: [
        "التحويل من شخص موثوق حصراً",
        "الحد الأدنى للإيداع: 20 دينار",
        "الحد الأقصى للإيداع: 150 دينار",
        "قد يستغرق إيداع الرصيد في الحساب ما بين 1 إلى 60 دقيقة",
      ],
      isActive: true,
      sortOrder: 3,
    },
    {
      id: 4,
      nameAr: "الإيداع من لبنان",
      nameEn: "Deposit from Lebanon",
      flagEmoji: "🇱🇧",
      fields: [
        { label: "اسم الخدمة", value: "WHISH MONEY", isCopyable: true },
        { label: "رقم الويش", value: "79492889", isCopyable: true },
      ],
      notes: [
        "الحد الأدنى للإيداع: 10 دولار 💵",
        "الضريبة: 1%",
        "يستغرق إيداع الرصيد في الحساب ما بين 1 و20 دقيقة",
      ],
      isActive: true,
      sortOrder: 4,
    },
    {
      id: 5,
      nameAr: "الإيداع من أوروبا",
      nameEn: "Deposit from Europe",
      flagEmoji: "🇪🇺",
      fields: [
        { label: "اسم صاحب الحساب", value: "Muhammed Fahed Kabbani", isCopyable: true },
        { label: "IBAN", value: "LT053500010018346329", isCopyable: true },
      ],
      notes: [
        "مطلوب كتابة اسم المرسل بالكامل",
        "الحد الأدنى للإيداع: 50 يورو",
        "يرجى تحويل الأموال باختيار التحويل السريع، وإلا سيتم الانتظار حتى وصول الحوالة",
      ],
      isActive: true,
      sortOrder: 5,
    },
    {
      id: 6,
      nameAr: "الإيداع العالمي (USDT)",
      nameEn: "Global Deposit (USDT)",
      flagEmoji: "🌍",
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
      isActive: true,
      sortOrder: 6,
    },
  ]).onConflictDoNothing();
}
