"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, ChevronDown, MessageSquare, Cpu, RotateCcw, Sparkles } from "lucide-react";
import { useIsMobileNav } from "@/hooks/useMediaQuery";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Merhaba! Ben AURA AI Teknik Servis ve Atölye Asistanınız. Cihaz arıza tespiti, yedek parça seçimi, stok ve servis işlemlerinizde size nasıl yardımcı olabilirim?",
};

const QUICK_PROMPTS = [
  "📱 Dokunmatik çalışmıyor",
  "⚡ Cihaz şarj almıyor",
  "🔋 Batarya çok çabuk bitiyor",
  "💧 Sıvı teması ilk müdahale",
];

export default function AuraAI() {
  const isMobileNav = useIsMobileNav();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/tenant/limits', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        const lim = json.limits as { ai_messages_remaining?: number };
        if (lim?.ai_messages_remaining != null) setAiRemaining(lim.ai_messages_remaining);
      })
      .catch(() => {});
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isOpen]);

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([INITIAL_MESSAGE]);
    setIsLoading(false);
  };

  const handleSendPrompt = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: { content?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = { error: `Sunucu yanıtı okunamadı (HTTP ${res.status})` };
      }

      if (!res.ok) {
        const detail = data.error || `HTTP ${res.status}`;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ AI yanıt veremedi: ${detail}` },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content || data.error || "Boş yanıt alındı." },
      ]);
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⏱️ Yanıt zaman aşımına uğradı. Lütfen tekrar deneyin." },
        ]);
      } else {
        console.error("AI Error:", error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Ağ hatası veya sunucuya ulaşılamadı. Lütfen sunucunun (npm run dev) çalıştığından emin olun." },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = () => {
    handleSendPrompt(input);
  };

  return (
    <div
      className="fixed z-50 flex flex-col items-end font-sans safe-bottom"
      style={{
        bottom: isMobileNav
          ? "calc(3.75rem + 0.75rem + env(safe-area-inset-bottom, 0px))"
          : "max(1.25rem, env(safe-area-inset-bottom, 0px))",
        right: "max(1.25rem, env(safe-area-inset-right, 0px))",
      }}
    >
      {/* SOHBET PENCERESİ */}
      {isOpen && (
        <div className="w-[min(100vw-2rem,22rem)] sm:w-88 h-[min(480px,calc(100dvh-6rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl flex flex-col overflow-hidden mb-4 transition-all duration-300 animate-in slide-in-from-bottom-5">
          {/* Üst Bar */}
          <div className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 p-3.5 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-xs">
                <Cpu size={18} className="text-cyan-200" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  Aura AI
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-medium">Asistan</span>
                </h3>
                <span className="text-[11px] text-cyan-100/90 leading-none">
                  Teknik Destek{aiRemaining != null ? ` · ${aiRemaining} mesaj kaldı` : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                title="Sohbeti Sıfırla"
                className="hover:bg-white/20 p-1.5 rounded-lg transition text-white/80 hover:text-white"
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Kapat"
                className="hover:bg-white/20 p-1.5 rounded-lg transition text-white/80 hover:text-white"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Mesaj Alanı */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 dark:bg-slate-950">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 text-sm shadow-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl rounded-br-xs font-normal"
                      : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-xs"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Hızlı Öneriler (Sadece başlangıçta) */}
            {messages.length === 1 && !isLoading && (
              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} className="text-cyan-500" />
                  Hızlı Sorular
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendPrompt(prompt)}
                      className="text-xs text-left px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Yükleniyor Animasyonu */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl rounded-bl-xs border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Yanıt hazırlanıyor...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Alanı */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              className="flex-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              placeholder="Sorunuzu veya arıza detayını yazın..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shrink-0 flex items-center justify-center cursor-pointer"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Yuvarlak Açma Butonu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-600 rounded-full shadow-xl shadow-cyan-500/25 flex items-center justify-center text-white hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer"
      >
        {isOpen ? <ChevronDown size={28} /> : <MessageSquare size={26} />}

        {/* Bildirim Noktası */}
        {!isOpen && messages.length > 1 && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        )}
      </button>
    </div>
  );
}