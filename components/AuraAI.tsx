"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, ChevronDown, MessageSquare, Cpu } from "lucide-react";
import { useIsMobileNav } from "@/hooks/useMediaQuery";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AuraAI() {
  const isMobileNav = useIsMobileNav();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Başlangıç mesajı
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Selam ustam! Aura Bilişim atölyesinde bugün ne yapıyoruz? Arıza tespiti mi, kodlama mı?" }
  ]);

  const [aiRemaining, setAiRemaining] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/tenant/limits', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        const lim = json.limits as { ai_messages_remaining?: number }
        if (lim?.ai_messages_remaining != null) setAiRemaining(lim.ai_messages_remaining)
      })
      .catch(() => {})
  }, [isOpen])

  // Mesaj gelince en alta kaydır
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    
    // Ekrana hemen basıyoruz (Optimistic UI)
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json() as { content?: string; error?: string };

      if (!res.ok) {
        const detail = data.error || `HTTP ${res.status}`;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `AI yanıt veremedi: ${detail}` },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.content || data.error || 'Boş yanıt' }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ağ hatası — sunucuya ulaşılamadı. npm run dev çalışıyor mu kontrol edin." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed z-50 flex flex-col items-end font-sans safe-bottom"
      style={{
        // Bottom nav (~3.5rem) + gap — avoid FAB overlap on phone
        bottom: isMobileNav
          ? 'calc(3.75rem + 0.75rem + env(safe-area-inset-bottom, 0px))'
          : 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
        right: 'max(1.25rem, env(safe-area-inset-right, 0px))',
      }}
    >
      
      {/* SOHBET PENCERESİ */}
      {isOpen && (
        <div className="w-[min(100vw-2rem,20rem)] sm:w-80 h-[min(450px,calc(100dvh-6rem))] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl rounded-2xl flex flex-col overflow-hidden mb-4 transition-all duration-300 animate-in slide-in-from-bottom-5">
          
          {/* Üst Bar */}
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-2">
              <Cpu size={20} className="text-cyan-200" />
              <div>
                <h3 className="font-bold text-sm leading-none">Aura AI</h3>
                <span className="text-[10px] text-cyan-100 opacity-80">
                  Teknik Asistan{aiRemaining != null ? ` · ${aiRemaining} mesaj kaldı` : ''}
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition">
              <X size={18} />
            </button>
          </div>

          {/* Mesaj Alanı */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "bg-cyan-600 text-white rounded-2xl rounded-br-none"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {/* Yükleniyor Animasyonu */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Alanı */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
              placeholder="Arızayı yaz..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Yuvarlak Açma Butonu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center text-white hover:scale-110 hover:shadow-2xl transition-all duration-300"
      >
        {isOpen ? <ChevronDown size={30} /> : <MessageSquare size={28} />}
        
        {/* Bildirim Noktası (Opsiyonel süs) */}
        {!isOpen && messages.length > 1 && (
           <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>
    </div>
  );
}