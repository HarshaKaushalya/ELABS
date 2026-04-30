"use client";

import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import clsx from "clsx";

type Message = { role: "user" | "assistant"; content: string };

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am your AI Laboratory Assistant. You can ask me questions about your lab manuals or equipment." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer || "Sorry, I couldn't process that." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error connecting to AI service." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          "fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 z-40",
          "bg-blue-600 hover:bg-blue-500 text-white",
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
        )}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <div
        className={clsx(
          "fixed bottom-6 right-6 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
        style={{ height: '500px', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-800/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-white font-medium">ELABS AI Assistant</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={clsx("flex flex-col max-w-[85%]", msg.role === "user" ? "ml-auto" : "mr-auto")}>
              <span className={clsx("text-xs mb-1", msg.role === "user" ? "text-right text-slate-400" : "text-left text-blue-400")}>
                {msg.role === "user" ? "You" : "AI"}
              </span>
              <div className={clsx("p-3 rounded-2xl text-sm", msg.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none")}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex flex-col max-w-[85%] mr-auto">
              <span className="text-xs mb-1 text-left text-blue-400">AI</span>
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-800">
          <form onSubmit={sendMessage} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
