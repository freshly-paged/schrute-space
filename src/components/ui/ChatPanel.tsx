import React, { useLayoutEffect, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { ChatMessage } from '../../types';
import { useGameStore } from '../../store/useGameStore';

const EMOTES = ['👋', '😂', '👍', '🔥', '🏢', '🥬'];

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const ChatPanel = ({ chatHistory, onSendMessage }: ChatPanelProps) => {
  const [chatInput, setChatInput] = useState('');
  const setChatFocused = useGameStore((state) => state.setChatFocused);
  const chatLogRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = chatLogRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatHistory]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="w-64 h-[calc(100vh-120px)] flex flex-col gap-4">
      {/* Chat history */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
          <MessageSquare className="text-indigo-400 w-4 h-4" />
          <h3 className="text-white font-bold text-xs uppercase tracking-widest">Chat Log</h3>
        </div>

        <div ref={chatLogRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
          {chatHistory.length === 0 && (
            <p className="text-white/20 text-[10px] text-center mt-10 italic">
              No messages yet...
            </p>
          )}
          {chatHistory.map((msg) => (
            <div key={msg.id} className="text-[10px]">
              <span className="text-indigo-400 font-bold">{msg.playerName}: </span>
              <span className="text-white/80">{msg.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl shadow-2xl">
        <div className="flex gap-2 mb-2">
          {EMOTES.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendMessage(emoji)}
              className="hover:scale-125 transition-transform text-sm"
            >
              {emoji}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onFocus={() => setChatFocused(true)}
            onBlur={() => setChatFocused(false)}
            placeholder="Type a message..."
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 flex-1"
          />
          <button
            type="submit"
            className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-lg transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
};
