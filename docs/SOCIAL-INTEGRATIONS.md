# تكاملات منصات التواصل

تظهر وظائف التكامل في لوحة المدير العام. العميل يستقبل حالة إعداد كل مزود فقط. احفظ رموز الوصول ومعرفات الحسابات على الخادم في أسرار بيئة التشغيل. لا تستخدم مفاتيح الإنتاج في بيئة الاختبارات.

| المزود | طريقة الإعداد | الوظيفة |
|---|---|---|
| WhatsApp Business | عيّن `WHATSAPP_ACCESS_TOKEN` بصلاحية `whatsapp_business_management`، و`WHATSAPP_BUSINESS_ACCOUNT_ID` لحساب WABA، و`META_GRAPH_VERSION` بإصدار مدعوم من الحساب. | يحمّل أول 50 قالبًا من حساب Meta مع اللغة والتصنيف والحالة. تعديل القالب وإرسال الرسائل يتمان من حساب المزود. |
| X | عيّن `X_BEARER_TOKEN` لتطبيق مخول باستعمال Recent Search. | بحث يدوي يعرض حتى 20 منشورًا من آخر سبعة أيام، مع رابط كل نتيجة. يخضع لحدود وأذونات المزود. |
| LinkedIn | عيّن `LINKEDIN_ACCESS_TOKEN` من تطبيق حاصل على Lead Sync وصلاحية `r_marketing_leadgen_automation` وحساب إعلانات مخول. اضبط `LINKEDIN_API_VERSION` بإصدار مدعوم بصيغة `YYYYMM`، ومعرف الحساب، والنموذج ورقم نسخته. | يعرض العملاء المحتملين المؤهلين من نموذج إعلاني محدد، ويستورد استجابة بعينها عند ضغط المدير على زر الاستيراد. |
| Telegram | عيّن `TELEGRAM_BOT_TOKEN` و`TELEGRAM_CHAT_ID`. | زر إرسال رسالة اختبار إلى الوجهة المضبوطة مسبقًا. |

في LinkedIn، اربط معرفات أسئلة الاسم الأول ورقم الهاتف عبر `LINKEDIN_FIRST_NAME_QUESTION_ID` و`LINKEDIN_PHONE_QUESTION_ID`. الاسم الأخير والبريد اختياريان. اضبط `LINKEDIN_CONTACT_CONSENT_ID` على خانة الموافقة التي تغطي التواصل المقصود. يراجع الخادم الحساب والإصدار والموافقة مرة ثانية عند الاستيراد. الرقم الموجود يُتخطى مع تسجيل السبب، ولا تُستبدل بيانات العميل. جدّد رمز الوصول من حساب المزود عند انتهاء صلاحيته.

أثناء التحقق استخدم حسابات وبيانات اختبار. تأكد من أن الإعداد الناقص يظهر على الواجهة بوضوح، وأن المدير وحده يمكنه استدعاء المسارات، وأن إعادة إرسال طلب استيراد نفس الاستجابة لا تضيف عميلًا ثانيًا.

مراجع المزودين: [قوالب Meta](https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/message_templates/)، [Recent Search من X](https://docs.x.com/x-api/posts/search-recent-posts)، [LinkedIn Lead Sync](https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync?view=li-lms-2026-10).
