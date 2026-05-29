export type FieldType = "text" | "number" | "date" | "time" | "select" | "textarea" | "tel" | "email";

export type Field = {
  key: string;
  en: string;
  ar: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; en: string; ar: string }[];
  placeholder_en?: string;
  placeholder_ar?: string;
};

const STATUS_OPTIONS = [
  { value: "active", en: "Active", ar: "نشط" },
  { value: "pending", en: "Pending", ar: "قيد الانتظار" },
  { value: "closed", en: "Closed", ar: "مغلق" },
];

const GENDER_OPTIONS = [
  { value: "male", en: "Male", ar: "ذكر" },
  { value: "female", en: "Female", ar: "أنثى" },
];

const PAYMENT_OPTIONS = [
  { value: "cash", en: "Cash", ar: "نقدي" },
  { value: "card", en: "Card", ar: "بطاقة" },
  { value: "transfer", en: "Bank Transfer", ar: "تحويل بنكي" },
  { value: "insurance", en: "Insurance", ar: "تأمين" },
];

const PRIORITY_OPTIONS = [
  { value: "low", en: "Low", ar: "منخفضة" },
  { value: "normal", en: "Normal", ar: "عادية" },
  { value: "high", en: "High", ar: "عالية" },
  { value: "urgent", en: "Urgent", ar: "عاجلة" },
];

// Field presets
const PATIENT_FIELDS: Field[] = [
  { key: "fileNo", en: "File No.", ar: "رقم الملف", type: "text", required: true },
  { key: "name", en: "Full Name", ar: "الاسم الكامل", type: "text", required: true },
  { key: "phone", en: "Phone", ar: "الهاتف", type: "tel" },
  { key: "nationalId", en: "National ID", ar: "رقم الهوية", type: "text" },
  { key: "dob", en: "Date of Birth", ar: "تاريخ الميلاد", type: "date" },
  { key: "gender", en: "Gender", ar: "الجنس", type: "select", options: GENDER_OPTIONS },
  { key: "address", en: "Address", ar: "العنوان", type: "text" },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

const APPOINTMENT_FIELDS: Field[] = [
  { key: "patient", en: "Patient Name", ar: "اسم المريض", type: "text", required: true },
  { key: "doctor", en: "Doctor", ar: "الطبيب", type: "text", required: true },
  { key: "clinic", en: "Clinic", ar: "العيادة", type: "text" },
  { key: "date", en: "Date", ar: "التاريخ", type: "date", required: true },
  { key: "time", en: "Time", ar: "الوقت", type: "time", required: true },
  { key: "status", en: "Status", ar: "الحالة", type: "select", options: STATUS_OPTIONS },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

const INVOICE_FIELDS: Field[] = [
  { key: "invoiceNo", en: "Invoice No.", ar: "رقم الفاتورة", type: "text", required: true },
  { key: "client", en: "Client / Patient", ar: "العميل / المريض", type: "text", required: true },
  { key: "date", en: "Date", ar: "التاريخ", type: "date", required: true },
  { key: "amount", en: "Amount (SAR)", ar: "المبلغ (ريال)", type: "number", required: true },
  { key: "tax", en: "VAT %", ar: "الضريبة %", type: "number" },
  { key: "payment", en: "Payment Method", ar: "طريقة الدفع", type: "select", options: PAYMENT_OPTIONS },
  { key: "status", en: "Status", ar: "الحالة", type: "select", options: STATUS_OPTIONS },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

const EMPLOYEE_FIELDS: Field[] = [
  { key: "empNo", en: "Employee No.", ar: "رقم الموظف", type: "text", required: true },
  { key: "name", en: "Full Name", ar: "الاسم الكامل", type: "text", required: true },
  { key: "position", en: "Position", ar: "المسمى الوظيفي", type: "text" },
  { key: "department", en: "Department", ar: "القسم", type: "text" },
  { key: "phone", en: "Phone", ar: "الهاتف", type: "tel" },
  { key: "email", en: "Email", ar: "البريد الإلكتروني", type: "email" },
  { key: "hireDate", en: "Hire Date", ar: "تاريخ التعيين", type: "date" },
  { key: "salary", en: "Salary (SAR)", ar: "الراتب (ريال)", type: "number" },
];

const LEAVE_FIELDS: Field[] = [
  { key: "employee", en: "Employee", ar: "الموظف", type: "text", required: true },
  { key: "leaveType", en: "Leave Type", ar: "نوع الإجازة", type: "select", options: [
    { value: "annual", en: "Annual", ar: "سنوية" },
    { value: "sick", en: "Sick", ar: "مرضية" },
    { value: "emergency", en: "Emergency", ar: "طارئة" },
    { value: "unpaid", en: "Unpaid", ar: "بدون راتب" },
  ]},
  { key: "from", en: "From", ar: "من", type: "date", required: true },
  { key: "to", en: "To", ar: "إلى", type: "date", required: true },
  { key: "status", en: "Status", ar: "الحالة", type: "select", options: STATUS_OPTIONS },
  { key: "reason", en: "Reason", ar: "السبب", type: "textarea" },
];

const ITEM_FIELDS: Field[] = [
  { key: "code", en: "Item Code", ar: "كود الصنف", type: "text", required: true },
  { key: "name", en: "Item Name", ar: "اسم الصنف", type: "text", required: true },
  { key: "category", en: "Category", ar: "التصنيف", type: "text" },
  { key: "unit", en: "Unit", ar: "الوحدة", type: "text" },
  { key: "quantity", en: "Quantity", ar: "الكمية", type: "number" },
  { key: "price", en: "Price (SAR)", ar: "السعر (ريال)", type: "number" },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

const SUPPLIER_FIELDS: Field[] = [
  { key: "code", en: "Supplier Code", ar: "كود المورد", type: "text", required: true },
  { key: "name", en: "Supplier Name", ar: "اسم المورد", type: "text", required: true },
  { key: "phone", en: "Phone", ar: "الهاتف", type: "tel" },
  { key: "email", en: "Email", ar: "البريد الإلكتروني", type: "email" },
  { key: "vatNo", en: "VAT No.", ar: "الرقم الضريبي", type: "text" },
  { key: "address", en: "Address", ar: "العنوان", type: "text" },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

const BANK_FIELDS: Field[] = [
  { key: "bankName", en: "Bank Name", ar: "اسم البنك", type: "text", required: true },
  { key: "accountName", en: "Account Name", ar: "اسم الحساب", type: "text", required: true },
  { key: "accountNo", en: "Account Number", ar: "رقم الحساب", type: "text", required: true },
  { key: "iban", en: "IBAN", ar: "الآيبان", type: "text" },
  { key: "currency", en: "Currency", ar: "العملة", type: "text" },
  { key: "balance", en: "Balance (SAR)", ar: "الرصيد (ريال)", type: "number" },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

const ASSET_FIELDS: Field[] = [
  { key: "code", en: "Asset Code", ar: "كود الأصل", type: "text", required: true },
  { key: "name", en: "Asset Name", ar: "اسم الأصل", type: "text", required: true },
  { key: "category", en: "Category", ar: "التصنيف", type: "text" },
  { key: "location", en: "Location", ar: "الموقع", type: "text" },
  { key: "purchaseDate", en: "Purchase Date", ar: "تاريخ الشراء", type: "date" },
  { key: "cost", en: "Cost (SAR)", ar: "التكلفة (ريال)", type: "number" },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

const MAINTENANCE_FIELDS: Field[] = [
  { key: "ticketNo", en: "Ticket No.", ar: "رقم البلاغ", type: "text", required: true },
  { key: "asset", en: "Asset / Equipment", ar: "الأصل / الجهاز", type: "text", required: true },
  { key: "issue", en: "Issue", ar: "العطل", type: "text", required: true },
  { key: "priority", en: "Priority", ar: "الأولوية", type: "select", options: PRIORITY_OPTIONS },
  { key: "assignedTo", en: "Assigned To", ar: "المعهود إليه", type: "text" },
  { key: "date", en: "Date", ar: "التاريخ", type: "date" },
  { key: "status", en: "Status", ar: "الحالة", type: "select", options: STATUS_OPTIONS },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

const VEHICLE_FIELDS: Field[] = [
  { key: "plate", en: "Plate No.", ar: "رقم اللوحة", type: "text", required: true },
  { key: "model", en: "Model", ar: "الموديل", type: "text" },
  { key: "year", en: "Year", ar: "السنة", type: "number" },
  { key: "driver", en: "Driver", ar: "السائق", type: "text" },
  { key: "odometer", en: "Odometer (km)", ar: "العداد (كم)", type: "number" },
  { key: "status", en: "Status", ar: "الحالة", type: "select", options: STATUS_OPTIONS },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

const TICKET_FIELDS: Field[] = [
  { key: "ticketNo", en: "Ticket No.", ar: "رقم التذكرة", type: "text", required: true },
  { key: "subject", en: "Subject", ar: "الموضوع", type: "text", required: true },
  { key: "customer", en: "Customer", ar: "العميل", type: "text" },
  { key: "channel", en: "Channel", ar: "القناة", type: "text" },
  { key: "priority", en: "Priority", ar: "الأولوية", type: "select", options: PRIORITY_OPTIONS },
  { key: "status", en: "Status", ar: "الحالة", type: "select", options: STATUS_OPTIONS },
  { key: "description", en: "Description", ar: "الوصف", type: "textarea" },
];

const DOCTOR_FIELDS: Field[] = [
  { key: "code", en: "Doctor Code", ar: "كود الطبيب", type: "text", required: true },
  { key: "name", en: "Full Name", ar: "الاسم الكامل", type: "text", required: true },
  { key: "specialty", en: "Specialty", ar: "التخصص", type: "text" },
  { key: "phone", en: "Phone", ar: "الهاتف", type: "tel" },
  { key: "email", en: "Email", ar: "البريد الإلكتروني", type: "email" },
  { key: "shift", en: "Shift", ar: "الوردية", type: "text" },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

const GENERIC_FIELDS: Field[] = [
  { key: "code", en: "Reference", ar: "المرجع", type: "text", required: true },
  { key: "name", en: "Name / Title", ar: "الاسم / العنوان", type: "text", required: true },
  { key: "date", en: "Date", ar: "التاريخ", type: "date" },
  { key: "amount", en: "Amount", ar: "المبلغ", type: "number" },
  { key: "status", en: "Status", ar: "الحالة", type: "select", options: STATUS_OPTIONS },
  { key: "notes", en: "Notes", ar: "ملاحظات", type: "textarea" },
];

export function getFormSchema(moduleSlug: string, subSlug: string): Field[] {
  const s = `${moduleSlug} ${subSlug}`.toLowerCase();

  if (/patient|mrn|medical-record/.test(s)) return PATIENT_FIELDS;
  if (/appointment|booking|reception|schedule|round/.test(s)) return APPOINTMENT_FIELDS;
  if (/invoice|billing|payment|claim|receipt|expense|voucher/.test(s)) return INVOICE_FIELDS;
  if (/doctor|physician|nurs/.test(s)) return DOCTOR_FIELDS;
  if (/employee|staff|payroll|attend|recruit|training/.test(s)) return EMPLOYEE_FIELDS;
  if (/leave|vacation|holiday/.test(s)) return LEAVE_FIELDS;
  if (/item|inventory|stock|product|warehouse|store/.test(s)) return ITEM_FIELDS;
  if (/supplier|vendor|purchas/.test(s)) return SUPPLIER_FIELDS;
  if (/bank|account|treasury/.test(s)) return BANK_FIELDS;
  if (/asset|fixed/.test(s)) return ASSET_FIELDS;
  if (/maintenance|repair|workorder/.test(s)) return MAINTENANCE_FIELDS;
  if (/vehicle|fleet|car/.test(s)) return VEHICLE_FIELDS;
  if (/ticket|support|complaint|crm|customer/.test(s)) return TICKET_FIELDS;

  return GENERIC_FIELDS;
}
