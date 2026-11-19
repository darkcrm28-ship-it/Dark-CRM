import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import kb from "@/lib/chatbot-kb.json";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const query = message.toLowerCase().trim();

    // Handling Numeric Choices
    if (query === "1") {
      let response = "📖 **شرح ميزات نظام دارك CRM:**\n\n";
      kb.features.forEach((f, i) => {
        response += `${i + 1}. **${f.topic}**: ${f.description}\n`;
      });
      response += "\nهل تريد الاستفسار عن ميزة محددة؟";
      return NextResponse.json({ response });
    }

    if (query === "2") {
      return NextResponse.json({ response: "🔍 للبحث عن عميل، من فضلك اكتب اسمه أو رقم هاتفه مباشرة في الرسالة القادمة." });
    }

    if (query === "3") {
      return NextResponse.json({ 
        response: "➕ لإضافة عميل جديد، يمكنك الذهاب إلى صفحة [قاعدة البيانات](/dashboard/customers) والضغط على زر 'إضافة عميل' في الأعلى." 
      });
    }

    if (query === "4") {
      return NextResponse.json({ 
        response: "🤝 **مطابقة العملاء:**\nيمكنك استخدام صفحة [المطابقة الذكية](/dashboard/match) للبحث عن مشترين يناسبون العقارات المتاحة، أو العكس. النظام يقوم بتحليل المساحات، المناطق، والميزانية آلياً." 
      });
    }

    if (query === "5") {
      return NextResponse.json({ 
        response: "👤 **ملفك الشخصي:**\nتأكد من إكمال بياناتك في [ملفي الشخصي](/dashboard/profile) لضمان دقة سجلات الموظفين والرواتب." 
      });
    }

    // 1. Search for Customer in DB (Existing logic, now fixed with prisma import)
    if (query.length >= 3 && !["1","2","3","4","5"].includes(query)) {
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } }
          ]
        },
        take: 5
      });

      if (customers.length > 0) {
        let response = `✅ وجدت ${customers.length} عملاء يطابقون بحثك:\n\n`;
        customers.forEach(c => {
          response += `• **${c.name}** (${c.phone})\n  [📂 فتح الملف](/dashboard/customers/${c.id})\n`;
        });
        return NextResponse.json({ response });
      }
    }

    // 2. Check FAQ
    const faqMatch = kb.faq.find(item => 
      query.includes(item.q.toLowerCase()) || item.q.toLowerCase().includes(query)
    );
    if (faqMatch) return NextResponse.json({ response: faqMatch.a });

    // 3. Check Features
    const featureMatch = kb.features.find(f => 
      query.includes(f.topic.toLowerCase()) || f.topic.toLowerCase().includes(query)
    );
    if (featureMatch) return NextResponse.json({ response: `${featureMatch.topic}: ${featureMatch.description}` });

    // 4. Greeting
    if (query.includes("مرحبا") || query.includes("اهلا") || query.includes("سلام") || query === "hi" || query === "hello") {
      return NextResponse.json({ 
        response: "أهلاً بك! أنا مساعد دارك الذكي. 🤖\n\nاختر رقماً للمساعدة:\n1️⃣ شرح النظام\n2️⃣ البحث عن عميل\n3️⃣ إدخال عميل جديد\n4️⃣ مطابقة بائع ومشتري\n5️⃣ إكمال ملفي الشخصي" 
      });
    }

    // 5. Default fallback
    return NextResponse.json({ 
      response: "عذراً، لم أفهم طلبك. يمكنك اختيار رقم من القائمة أو كتابة اسم عميل للبحث عنه:\n1️⃣ شرح النظام\n2️⃣ البحث عن عميل\n3️⃣ إدخال عميل جديد\n4️⃣ مطابقة بائع ومشتري\n5️⃣ إكمال ملفي الشخصي" 
    });

  } catch (error) {
    console.error("Chatbot Error:", error);
    return NextResponse.json({ response: "حدث خطأ في النظام الذكي. حاول لاحقاً." }, { status: 500 });
  }
}
