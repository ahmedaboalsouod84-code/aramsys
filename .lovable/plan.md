# خطة التنفيذ — تحليل الفجوات الكامل (21 موديول)

أعدت تحليل النظام الحالي ومطابقته مع قائمة الـ 21 بنداً. الجدول التالي يحدد ما هو موجود/جزئي/مفقود، وأي بنود يمكن إنجازها بسرعة وأيها تحتاج عمل كبير.

## حالة كل بند مقارنة بالنظام الحالي

| # | الموديول | الحالة | التعديل المطلوب |
|---|---------|--------|-----------------|
| 1 | Patient Registration | ✓ جزئي (هوية 10 أرقام + سعودي بـ1 تم) | منع التكرار + Timeline زيارات |
| 2 | Case Management (8 stages) | ✗ مفقود | بناء كامل (state machine) |
| 3 | Doctor Workspace | ✓ جزئي | فصل الصلاحيات + Treatment Plan + Prescriptions |
| 4 | Billing: Case→Payment→Invoice | ✗ منطق معكوس حالياً | إعادة هندسة كاملة |
| 5 | VAT Engine | ✓ جزئي (سعودي 0/أجنبي 15) | Inclusive/Exclusive/Exempt switches |
| 6 | Partial Payments + Customer Ledger | ✗ مفقود | Ledger مرتبط بالهوية |
| 7 | Tabby/Tamara + Claims | ✗ مفقود | حسابات عملاء + قيود عمولة + Claim builder |
| 8 | Reception Treasury (Shift) | ✗ مفقود | Open/Close shift + Cash count |
| 9 | Treasury Clearing Account | ✗ مفقود | حساب وسيط + Workflow اعتماد |
| 10 | Purchasing Redesign | ✓ جزئي | إلغاء Returns، إضافة PR/PO/GR/VI/CN |
| 11 | Inventory Accounting | ✓ جزئي | أتمتة + VAT inc/exc + استلام جزئي |
| 12 | Medical Supplies Consumption | ✗ مفقود | ربط خدمة → BOM مستهلكات |
| 13 | Sterilization Tracking | ✗ مفقود | 6 حالات لكل أداة |
| 14 | Fixed Assets (extended fields) | ✓ جزئي | إضافة الحقول الجديدة |
| 15 | Depreciation Engine (auto) | ✗ مفقود | محرّك شهري + قيود |
| 16 | Bank Reconciliation (SAP-style) | ✓ مكتمل | — |
| 17 | COA Integration (137 حساب) | ✓ مكتمل | منع أي posting بدون mapping |
| 18 | Cost Centers + توزيع | ✓ موجود | تفعيل التوزيع الفعلي |
| 19 | Profit Centers (طبيب/خدمة/عيادة) | ✓ جزئي | لكل طبيب وخدمة |
| 20 | Accounting Automation Layer | ✗ مشتت | طبقة موحّدة `posting-rules.ts` |
| 21 | Reports (12 تقرير) | ✓ جزئي (Trial/GL/IS/BS) | Customer/Vendor Ledger/Aging/VAT/Outstanding |

## التنفيذ المرحلي حسب الأولوية المطلوبة

### Phase 1 — Patient Journey + Cases + Payments + Treasury  
الأكبر والأهم. أتوقع أن يستغرق أكثر من جلسة واحدة:

1. **Case Management Engine** (جديد كلياً): جدول `cases` + 8 حالات + state machine + صلاحيات.
2. **Doctor Workspace**: تعديل صفحة العيادة لإضافة Treatment Plan، Prescriptions، Follow-up، حظر تعديل الأسعار على غير الطبيب.
3. **Billing Redesign**: حذف "Create Invoice" المباشر. الإنڤويس لا يُولَّد إلا بعد دفعة فعلية. نوعان فقط: Partial / Full.
4. **Customer Balance Ledger**: مرتبط برقم الهوية، يعرض Outstanding/Advances/Invoices/Cases.
5. **Reception Treasury (Shifts)**: Open/Close shift، Cash count، Shortage/Overage، محضر جرد يومي مطبوع.
6. **Treasury Clearing Account**: حساب وسيط جديد + اعتماد المحاسب لتحويل Reception → Main Cash.
7. **Tabby/Tamara**: حسابي عميل منفصلين + قيد عمولة آلي + شاشة Claim builder.

### Phase 2 — Purchasing + Inventory + Assets

8. حذف "Purchase Returns" واستبدالها بـ Credit Note.
9. سلسلة كاملة PR → PO → GR (جزئي) → VI → CN مع VAT inc/exc.
10. **Service BOM**: لكل خدمة قائمة مستهلكات تُصرف تلقائياً عند تقديم الخدمة.
11. **Sterilization Tracking**: 6 حالات للأداة + شاشة دورة التعقيم.
12. **Fixed Assets**: حقول Purchase/Usage Start/Depreciation Start/Useful Life/Residual/Category/Location/Clinic.
13. **Depreciation Engine**: cron داخلي شهري + قيد آلي.

### Phase 3 — Automation + Bank Recon + Cost Centers

14. **`posting-rules.ts`**: طبقة موحّدة لكل القيود الآلية (مرضى/مشتريات/مخزون/أصول/إهلاك/تابي/خزينة/تسوية) — تستبدل القيود المتفرقة في كل صفحة.
15. **منع أي posting بدون Mapping**: التحقق من وجود الحساب في الشجرة قبل الترحيل.
16. **توزيع المصروفات بالنسب الفعلية** على مراكز التكلفة (موجود الهيكل، يحتاج تفعيل التنفيذ).

### Phase 4 — Reports & Profitability

17. تقارير ناقصة: Customer Ledger، Vendor Ledger، Aging (30/60/90/+90)، VAT Report (مدخلات/مخرجات)، Outstanding Cases، Outstanding Claims، Cash Flow.
18. P&L لكل مركز ربحية على مستوى: عيادة / طبيب / خدمة.

## ملاحظات تقنية

- النظام يعمل حالياً على `localStorage` (نسخة عرض). إعادة هندسة بهذا الحجم تستحق نقاش الانتقال إلى Lovable Cloud (Postgres + RLS) خصوصاً مع: مطالبات تابي/تمارا، Audit trail للأصول، Shifts، Claims — هذه بيانات لا تحتمل ضياعاً عند مسح المتصفح.
- كل مرحلة من المراحل الأربع ستستغرق على الأرجح عدة دورات تنفيذ (turns) منفصلة، ليس جلسة واحدة.

## ما الذي تريد البدء به؟

أقترح أن أبدأ بـ **Phase 1** كاملة بالترتيب أعلاه. هل أبدأ بـ:

**(أ)** Phase 1 كاملة دفعة واحدة (سيستغرق عدة جلسات) — الأكثر فائدة.  
**(ب)** بنود محددة من Phase 1 تختارها (مثلاً: Case Management + Billing Redesign فقط).  
**(ج)** نناقش أولاً الانتقال إلى Lovable Cloud قبل أي إعادة هندسة، حتى لا نبني مرتين.

اختر A/B/C وأبدأ فوراً.
