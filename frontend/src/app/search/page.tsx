"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface Dish {
  id: string;
  name: string;
  restaurant: string;
  restaurant_id: string;
  price: number;
  is_veg: boolean;
  description: string;
  distance: number;
}

interface SearchResponse {
  answer: string;
  dishes: Dish[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  dishes?: Dish[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const currentQuery = query;
    const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));
    
    setMessages(prev => [...prev, { role: "user", content: currentQuery }]);
    setQuery("");
    setIsLoading(true);
    setError("");

    try {
      const data = await apiPost<SearchResponse>("/search", { query: currentQuery, history: historyPayload });
      setMessages(prev => [...prev, { role: "assistant", content: data.answer, dishes: data.dishes }]);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to search. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="p-6 md:px-12 md:py-8 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-neutral-400 hover:text-orange-400 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 hidden sm:block">
            ForkFlow AI Assistant
          </h1>
          <div className="w-[100px]"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4 pt-12 pb-24"
            >
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                How can I help you <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">find the perfect meal?</span>
              </h2>
              <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
                Ask me for recommendations, dietary preferences, or specific cravings. I'll remember our conversation!
              </p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl rounded-tr-sm px-6 py-4 max-w-[85%] md:max-w-[70%] shadow-lg">
                    <p className="text-lg">{msg.content}</p>
                  </div>
                ) : (
                  <div className="w-full max-w-[90%] md:max-w-[80%] space-y-6">
                    <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-800 rounded-2xl rounded-tl-sm p-6 md:p-8 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-rose-400"></div>
                      <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI Assistant
                      </h3>
                      <p className="text-neutral-200 text-lg leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>

                    {msg.dishes && msg.dishes.length > 0 && (
                      <div className="space-y-4 pl-4 md:pl-8 border-l border-neutral-800">
                        <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Suggested Dishes</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {msg.dishes.map((dish, idx) => (
                            <Link href={`/restaurants/${dish.restaurant_id}`} key={`${index}-${dish.id}`}>
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 rounded-2xl p-5 transition-all hover:bg-neutral-800/80 hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer h-full"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h5 className="font-bold text-lg text-white group-hover:text-orange-400 transition-colors">{dish.name}</h5>
                                  <span className="font-mono text-orange-400 font-bold bg-orange-400/10 px-3 py-1 rounded-full text-sm">
                                    ₹{dish.price}
                                  </span>
                                </div>
                                <p className="text-sm text-neutral-400 mb-4">{dish.restaurant}</p>
                                <p className="text-neutral-300 text-sm line-clamp-2 mb-4">
                                  {dish.description || "No description available."}
                                </p>
                                <div className="flex gap-2">
                                  <span className={`text-xs px-2 py-1 rounded-md font-medium ${dish.is_veg ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {dish.is_veg ? "Veg" : "Non-Veg"}
                                  </span>
                                </div>
                              </motion.div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl rounded-tl-sm p-6 shadow-xl flex gap-2 items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
              {error}
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 md:p-8 bg-neutral-950/90 backdrop-blur-md border-t border-neutral-900">
        <form onSubmit={handleSearch} className="max-w-4xl mx-auto relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-rose-500/10 rounded-2xl blur-xl transition-all duration-300 group-hover:blur-2xl opacity-50"></div>
          <div className="relative flex items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-2 shadow-2xl focus-within:border-orange-500/50 transition-colors">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask for food recommendations..."
              className="flex-1 bg-transparent border-none text-white px-6 py-4 outline-none text-lg placeholder:text-neutral-600"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
