import React, { useLayoutEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage } from '../../types';
import { useGameStore } from '../../store/useGameStore';

const EMOTES = ['👋', '😂', '👍', '🔥', '🏢', '🥬'];
const URL_PART_REGEX = /(https?:\/\/[^\s]+)/g;

function renderChatText(text: string) {
  return text.split(URL_PART_REGEX).map((part, idx) => {
    if (!/^https?:\/\/\S+$/i.test(part)) {
      return <React.Fragment key={`${idx}-${part}`}>{part}</React.Fragment>;
    }
    return (
      <a
        key={`${idx}-${part}`}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
        style={{ color: 'var(--color-schrute)' }}
      >
        {part}
      </a>
    );
  });
}

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
    <div className="w-64 h-[calc(100vh-120px)] flex flex-col gap-4 font-pixel">
      {/* Chat history panel */}
      <div className="pixel-panel flex-1 flex flex-col overflow-hidden p-0">
        {/* Header band */}
        <div className="px-4 py-2" style={{ background: 'var(--color-schrute)' }}>
          <div className="text-white text-[8px] uppercase tracking-widest">Message Log</div>
          <div className="text-[7px] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Dunder Mifflin Internal
          </div>
        </div>

        {/* Lined paper chat area */}
        <div ref={chatLogRef} className="lined-paper flex-1 overflow-y-auto p-3 space-y-3">
          {chatHistory.length === 0 && (
            <p
              className="text-[8px] text-center mt-8 italic"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              No messages yet...
            </p>
          )}
          {chatHistory.map((msg) => (
            <div key={msg.id} className="text-[8px] leading-relaxed">
              <span className="font-bold" style={{ color: 'var(--color-schrute)' }}>
                {msg.playerName}:{' '}
              </span>
              <span style={{ color: 'var(--color-ink)' }}>{renderChatText(msg.text)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Input panel */}
      <div className="pixel-panel p-3">
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
        <hr className="memo-rule" />
        <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onFocus={() => setChatFocused(true)}
            onBlur={() => setChatFocused(false)}
            placeholder="Type message..."
            className="pixel-input flex-1 min-w-0"
          />
          <button type="submit" className="pixel-button" style={{ padding: '8px 12px' }}>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </div>
  );
};
