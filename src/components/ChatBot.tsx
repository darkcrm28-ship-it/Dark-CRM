"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatBot() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "أهلاً بك في دارك CRM! أنا مساعدك الذكي. 🤖\n\nاختر رقماً للمساعدة:\n1️⃣ شرح النظام\n2️⃣ البحث عن عميل\n3️⃣ إدخال عميل جديد\n4️⃣ مطابقة بائع ومشتري\n5️⃣ إكمال ملفي الشخصي" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", text: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "عذراً، واجهت مشكلة في الاتصال." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 85, left: 24, zIndex: 9999 }}>
      {/* Chat Window */}
      {isOpen && (
        <div style={{
          width: 320, height: 450,
          background: "rgba(15, 23, 42, 0.98)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(212, 175, 55, 0.3)",
          borderRadius: 20,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
          display: "flex", flexDirection: "column",
          overflow: "hidden", marginBottom: 16,
          animation: "slideUp 0.3s ease"
        }}>
          {/* Header */}
          <div style={{ 
            padding: "16px 20px", 
            background: "linear-gradient(135deg, #d4af37, #a8892a)", 
            color: "#000", fontWeight: 800,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <span>مساعد دارك الذكي</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-start" : "flex-end",
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: m.role === "user" ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                background: m.role === "user" ? "rgba(255,255,255,0.05)" : "rgba(212, 175, 55, 0.15)",
                border: m.role === "user" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(212, 175, 55, 0.3)",
                fontSize: 13, color: "#f1f5f9", lineHeight: 1.5,
                textAlign: "right",
                whiteSpace: "pre-wrap"
              }}>
                {m.text.split(/(\[.*?\]\(.*?\))/g).map((part, index) => {
                  const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
                  if (linkMatch) {
                    return (
                      <a 
                        key={index} 
                        href={linkMatch[2]} 
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(linkMatch[2]);
                        }}
                        style={{ color: "var(--gold-primary)", fontWeight: 700, textDecoration: "underline" }}
                      >
                        {linkMatch[1]}
                      </a>
                    );
                  }
                  return part;
                })}
              </div>
            ))}
            {loading && <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>جاري التفكير...</div>}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 8 }}>
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="اكتب سؤالك هنا..."
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none"
              }}
            />
            <button onClick={handleSend} style={{
              background: "var(--gold-primary)", border: "none", borderRadius: 10,
              width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              ✈️
            </button>
          </div>
        </div>
      )}

      {/* Bubble Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #d4af37, #a8892a)",
          boxShadow: "0 10px 30px rgba(212, 175, 55, 0.3)",
          border: "none", cursor: "pointer", fontSize: 24,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        {isOpen ? "✕" : "🤖"}
      </button>
    </div>
  );
}
