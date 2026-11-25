# المرحلة الرابعة — فجوات نموذج البيانات العقارية (ورقة تصميم فقط)

> **حالة المستند:** مقترح للمراجعة فقط. لم يُطبّق أي تغيير في `prisma/schema.prisma` أو في هجرات قاعدة البيانات أو في أي API. لا يجوز تنفيذ أي هجرة قبل اعتماد هذا التصميم صراحةً.

## 1. مصدر المقارنة

| المرجع | الترخيص | ما استُفيد منه |
|---|---|---|
| `espocrm/ext-real-estate` — `entityDefs/RealEstateProperty.json`, `RealEstateRequest.json`, `RealEstateLocation.json` | AGPL-3.0 | بنية الكيانات والعلاقات فقط (لا نقل كود) |
| `open-condo-software/condo` — `domains/property/schema/Property.js`, `domains/document/schema/Document.js`, `domains/contact/schema/Contact.js` | MIT | أفكار المخطط/الصور وربط المستندات |

## 2. الوضع الحالي في Dark CRM

- `Property.images: String?` — سلسلة واحدة مسطّحة، بلا ترتيب ولا صورة رئيسية ولا صلاحية نشر مستقلة.
- `PublicListing.publicImageKeys: Json?` — قائمة مفاتيح للكتالوج العام، منفصلة تماماً عن صور الوحدة الداخلية.
- `Project` — كيان مسطّح (اسم + وصف) بلا علاقة أب/ابن، بينما `Property.projectName` و`Property.zone` و`CustomerNeed.city/zone` نصوص حرة.
- `CustomerNeed` موجود ويدعم احتياجات متعددة بنطاقات ميزانية ومساحة — يغني عن إضافة كيان «طلب» جديد.
- `PropertyOwnership` و`PropertyOwner` كلاهما يحفظ `effectiveFrom/effectiveTo/isCurrent` و`transferReason` و`previousOwnerId` في الأول — **لا حاجة لجدول `OwnershipTransferHistory` جديد**.

## 3. الفجوة (1): معرض صور الوحدة `PropertyImage`

### المقترح (Additive)

```prisma
model PropertyImage {
  id           String   @id @default(uuid())
  propertyId   String
  storageKey   String   @unique      // مفتاح ImageKit الخاص
  fileName     String
  mimeType     String
  sizeBytes    Int
  sortOrder    Int      @default(0)
  isPrimary    Boolean  @default(false)
  isPublic     Boolean  @default(false)
  isDeleted    Boolean  @default(false)
  caption      String?
  uploadedById String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  property     Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@index([propertyId, sortOrder])
  @@index([propertyId, isPublic])
  // فهرس جزئي: صورة رئيسية واحدة لكل وحدة
}
```

### قواعد الربط

1. **`Property.images` يبقى كما هو** مصدراً للقراءة القديمة. طبقة قراءة واحدة تدمج: صفوف `PropertyImage` + تحليل `Property.images` القديم، مع تغلب الصفوف الجديدة عند التضارب.
2. عند الكتابة في المسار الجديد: يُضاف سجل `PropertyImage` **ويُحدَّث** `Property.images` بنفس القيم لفترة انتقالية (Dual-write) حتى يُعتمد نقل القراءة بالكامل.
3. الصورة الرئيسية: فهرس جزئي فريد على `(propertyId) WHERE isPrimary = true AND isDeleted = false` يُنشأ بـ SQL صريح في الهجرة (Prisma لا يدعم الفهارس الجزئية)، واستبدالها يتم في transaction واحدة.
4. **الخصوصية:** `isPublic` شرط ضروري وليس كافياً؛ الكتالوج العام يمرّ حتماً عبر Public DTO يعرض `storageKey` فقط للصور المسموحة، ولا يعرض السعر أو العنوان الدقيق أو بيانات الملاك (المرحلة السادسة).
5. الحذف منطقي (`isDeleted`) أو حذف فعلي للسجل فقط مع حذف ملف ImageKit في نفس العملية؛ لا حذف لأعمدة قديمة.

## 4. الفجوة (2): شجرة المواقع `Location`

### المقترح (Additive)

```prisma
model Location {
  id         String     @id @default(uuid())
  key        String     @unique      // معرّف نصي ثابت للربط والاستيراد
  name       String
  type       String                  // GOVERNORATE | CITY | DISTRICT | PROJECT | ZONE | BUILDING
  parentId   String?
  isActive   Boolean    @default(true)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  parent     Location?  @relation("LocationTree", fields: [parentId], references: [id])
  children   Location[] @relation("LocationTree")
  properties Property[]
  needs      CustomerNeed[]
}
```

### قواعد الربط

1. تُضاف أعمدة **nullable** فقط: `Property.locationId?` و`CustomerNeed.locationId?`. لا تُحذف ولا تُعدَّل حقول `projectName / zone / city / project` النصية الحالية.
2. البذر (seed) يستخرج القيم المكررة من النصوص الحالية كمرحلة منفصلة قابلة للمراجعة، **دون إعادة تعيين السجلات القديمة تلقائياً**. الربط يتم تدريجياً عبر الواجهات.
3. الواجهة تسمح باختيار موقع من الشجرة مع إبقاء النص الحر احتياطياً؛ الاستيراد من Excel يستخدم `key` إذا وُجد وإلا ينشئ موقعاً جديداً بعد موافقة.
4. في المطابقة لاحقاً (المرحلة التاسعة): يُؤخذ الموقع + أسلافه (`parent chain`) في الاعتبار عند مقارنة `CustomerNeed` بـ `Property`، دون إلغاء المطابقة النصية الحالية.

## 5. ما لا نضيفه

- **لا `OwnershipTransferHistory`:** `PropertyOwnership` و`PropertyOwner` يغطيان التاريخ والحالة الحالية. المطلوب هو موحّد قراءة (adapter) يحسم أيهما المصدر عند التعارض، لا جدول ثالث.
- **لا كيان «طلب عميل» جديد:** `CustomerNeed` يغطي تعدد الطلبات والنطاقات السعرية والمساحية.
- **لا هجرة الآن:** كل ما سبق تصميم؛ التنفيذ يخضع لبوابة «مراجعة تصميم الهجرة واعتمادها» في `UNIFIED-PLAN.md`.

## 6. بوابة التنفيذ المقترحة (عند الموافقة لاحقاً)

1. هجرة واحدة additive جديدة: إنشاء جدولي `PropertyImage` و`Location` + الأعمدة القابلة للـ null + الفهارس — بلا تعديل أو حذف أي عمود قديم.
2. `prisma migrate diff` يُراجع نصياً قبل التطبيق؛ لا تشغيل على Neon الإنتاجي إلا بعد موافقة صريحة.
3. اختبارات وحدة على: منع صورتين رئيسيتين، مجموع الملكية 100%، سلامة الشجرة (منع الدورات)، وعدم تسريب الصور غير العامة في DTO.
4. dual-read/dual-write للصور ثم نقل القراءة على مرحلة لاحقة منفصلة.

---

أُعدّ هذا المستند من مراجعة بيانات GitHub العامة للمشروعين المذكورين، دون نسخ كود منهما ودون لمس قاعدة البيانات.
