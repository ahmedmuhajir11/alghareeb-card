import { db, sectionsTable, itemsTable, packagesTable, paymentMethodsTable, settingsTable } from "@workspace/db";
import { count } from "drizzle-orm";

export async function ensureCriticalSections() {
  // Ensure the 6 core business sections exist
  await db.insert(sectionsTable).values([
    { id: 1, nameAr: "شحن الألعاب", nameEn: "Game Top-Up", sortOrder: 1, pricingType: "packages" },
    { id: 2, nameAr: "شحن التطبيقات", nameEn: "App Top-Up", sortOrder: 2, pricingType: "per_quantity", logoUrl: "/section-apps-topup.jpg" },
    { id: 3, nameAr: "الحوالات المالية", nameEn: "Money Transfers", sortOrder: 3, pricingType: "per_quantity" },
    { id: 4, nameAr: "سحب رواتب المضيفين", nameEn: "Host Salary Withdrawal", sortOrder: 4, pricingType: "per_quantity" },
    { id: 5, nameAr: "تعبئة الرصيد", nameEn: "Credit Recharge", sortOrder: 5, pricingType: "packages" },
    { id: 6, nameAr: "طرق الدفع والإيداع", nameEn: "Payment Methods", sortOrder: 6, pricingType: "per_quantity" },
  ]).onConflictDoNothing();

  try {
    const { pool } = await import("@workspace/db");
    
    // 1. RECOVERY FIX: Guarantee section 2 is named "شحن التطبيقات" (App Top-Up)
    await pool.query(`
      UPDATE sections 
      SET name_ar = 'شحن التطبيقات',
          name_en = 'App Top-Up',
          pricing_type = 'per_quantity',
          sort_order = 2
      WHERE id = 2;
    `);

    // 2. If section 2 has no logoUrl or has dev hero image, update to dedicated app topup card
    await pool.query(`
      UPDATE sections
      SET logo_url = '/section-apps-topup.jpg'
      WHERE id = 2 AND (logo_url IS NULL OR logo_url = '' OR logo_url = '/section-apps-dev.jpg' OR logo_url = '/dev-mobile-hero.jpg');
    `);

    // 3. If any other section was renamed to dev services while holding user items, restore its name
    await pool.query(`
      UPDATE sections 
      SET name_ar = 'شحن التطبيقات',
          name_en = 'App Top-Up',
          pricing_type = 'per_quantity'
      WHERE id NOT IN (1, 3, 4, 5, 6)
        AND (name_ar LIKE '%تصميم وبرمجة%' OR name_ar = 'التصميم والبرمجة')
        AND (SELECT COUNT(*) FROM items WHERE section_id = sections.id) > 0;
    `);

    // 4. Ensure default apps for section 2 exist and are active
    await pool.query(`
      INSERT INTO items (id, section_id, name_ar, name_en, min_quantity, sort_order, is_active, currency_unit, price_per_unit)
      VALUES 
        (10, 2, 'بارتي ستار', 'party star', 1, 1, true, 'ماسات', 0.0011236),
        (11, 2, 'سول ستار', 'Soul Star', 1, 2, true, 'كوينز', 0.000128575),
        (5, 2, 'بيغو لايف', 'BIGO LIVE', 1, 3, true, 'ماسات', 0.0186),
        (6, 2, 'واهو شات', 'WAHO CHAT', 1, 4, true, 'كوينز', 9496.67616334283),
        (7, 2, 'يويو شات', 'YOYO CHAT', 1, 5, true, 'كوينز', 0.00079828),
        (17, 2, 'سو ماتش', 'SoMatch', 1, 6, true, 'كوينز', 0.000129870129870129),
        (13, 2, 'سول شيل', 'SOULCHIIL', 1, 7, true, 'ماسات', 0.00188452)
      ON CONFLICT (id) DO UPDATE SET
        is_active = true;
    `);

    // 5. Ensure dev_settings initial record exists in its own table
    await pool.query(`
      INSERT INTO dev_settings (id, whatsapp_number, websites_enabled, mobile_apps_enabled, websites_hero_title, websites_hero_image, mobile_apps_hero_title, mobile_apps_hero_image)
      VALUES (1, '00905378221375', true, true, 'تطوير وبرمجة المواقع', '/dev-web-hero.jpg', 'تطوير وتطبيقات الجوال', '/dev-mobile-hero.jpg')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 6. Seed default website service cards in its own table if empty
    const wcCount = await pool.query(`SELECT COUNT(*)::int as c FROM dev_service_cards WHERE service_type = 'websites'`);
    if (wcCount.rows[0].c === 0) {
      await pool.query(`
        INSERT INTO dev_service_cards (service_type, name_ar, name_en, description_ar, image_url, sort_order) VALUES
        ('websites', 'تصميم المتاجر الإلكترونية', 'E-commerce Stores', 'متاجر متكاملة مع بوابات دفع، إدارة مخزون، وسلة تسوق احترافية وسريعة.', '/dev-web-hero.jpg', 1),
        ('websites', 'مواقع الشركات والمؤسسات', 'Corporate Websites', 'مواقع تعريفية فاخرة تعكس الهوية المؤسسية باحترافية وتجذب العملاء.', '/dev-web-hero.jpg', 2),
        ('websites', 'مواقع المطاعم والكافيهات', 'Restaurant & Cafe Websites', 'منيو رقمي، طلبات أونلاين، حجز طاولات مع لوحة تحكم سهلة.', '/dev-web-hero.jpg', 3),
        ('websites', 'منصات الحجز والخدمات', 'Booking & Services Platforms', 'أنظمة حجز مواعيد وإدارة حجوزات للمراكز الطبية والخدمية.', '/dev-web-hero.jpg', 4),
        ('websites', 'مواقع العقارات والسيارات', 'Real Estate & Car Portals', 'عرض العقارات والسيارات مع فلاتر بحث متقدمة وتواصل سريع.', '/dev-web-hero.jpg', 5),
        ('websites', 'أنظمة ومواقع مخصصة', 'Custom Web Applications', 'حلول برمجية مخصصة بالكامل تلبي متطلبات عملك الخاصة بدقة.', '/dev-web-hero.jpg', 6);
      `);
    }

    // 7. Seed default mobile app service cards in its own table if empty
    const mcCount = await pool.query(`SELECT COUNT(*)::int as c FROM dev_service_cards WHERE service_type = 'mobile_apps'`);
    if (mcCount.rows[0].c === 0) {
      await pool.query(`
        INSERT INTO dev_service_cards (service_type, name_ar, name_en, description_ar, image_url, sort_order) VALUES
        ('mobile_apps', 'تطبيقات المتاجر الإلكترونية', 'Shopping Apps', 'تطبيقات تسوق سريعة وممتعة لـ Android و iOS مع بوابات دفع وإشعارات.', '/dev-mobile-hero.jpg', 1),
        ('mobile_apps', 'تطبيقات التوصيل والمطاعم', 'Delivery Apps', 'تتبع حي للطلبات، خرائط، وتوجيه المندوبين مع تجربة مستخدم سلسة.', '/dev-mobile-hero.jpg', 2),
        ('mobile_apps', 'تطبيقات الخدمات والحجوزات', 'Service & Booking Apps', 'حجز مواعيد وطلب خدمات منزلية وتقنية مباشرة بضغطة زر.', '/dev-mobile-hero.jpg', 3),
        ('mobile_apps', 'تطبيقات الشركات والأعمال', 'Business Apps', 'تطبيقات لإدارة الأعمال والموظفين والعملاء بكفاءة وأمان.', '/dev-mobile-hero.jpg', 4),
        ('mobile_apps', 'تطبيقات العقارات والإعلانات', 'Classifieds & Real Estate', 'منصات إعلانية وتطبيقات بيع وشراء مع إشعارات فورية.', '/dev-mobile-hero.jpg', 5),
        ('mobile_apps', 'تطبيقات مخصصة وفكرة فريدة', 'Custom Mobile Apps', 'نحول فكرتك المبتكرة إلى تطبيق حقيقي ينافس بقوة في المتاجر.', '/dev-mobile-hero.jpg', 6);
      `);
    }
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
