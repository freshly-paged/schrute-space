import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameStore, type GameNotification, type NotificationType } from '../../store/useGameStore';

const AUTO_DISMISS_MS = 4000;

const TOAST_STYLES: Record<NotificationType, { icon: string; borderColor: string }> = {
  join:  { icon: '🟢', borderColor: '#166534' },
  leave: { icon: '🔴', borderColor: '#dc2626' },
  chat:  { icon: '💬', borderColor: '#1d4ed8' },
  kick:  { icon: '⚠️', borderColor: '#ea580c' },
};

function ToastItem({ note }: { note: GameNotification }) {
  const dismiss = useGameStore((s) => s.dismissNotification);

  useEffect(() => {
    const remaining = note.createdAt + AUTO_DISMISS_MS - Date.now();
    if (remaining <= 0) { dismiss(note.id); return; }
    const id = window.setTimeout(() => dismiss(note.id), remaining);
    return () => window.clearTimeout(id);
  }, [note.id, note.createdAt, dismiss]);

  const { icon, borderColor } = TOAST_STYLES[note.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-auto font-pixel flex items-center gap-2 px-3 py-2 max-w-[260px]"
      style={{
        background: 'var(--color-paper)',
        border: `3px solid ${borderColor}`,
        boxShadow: '4px 4px 0 0 #000',
      }}
    >
      <span style={{ fontSize: 11, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <p className="text-[7px] leading-snug flex-1 break-words" style={{ color: 'var(--color-ink)' }}>
        {note.message}
      </p>
      <button
        onClick={() => dismiss(note.id)}
        className="text-[9px] shrink-0 leading-none"
        style={{ color: 'var(--color-ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        ✕
      </button>
    </motion.div>
  );
}

export function NotificationToast() {
  const notifications = useGameStore((s) => s.notifications);
  const visible = notifications.slice(-4);

  return (
    <div className="pointer-events-none absolute top-6 right-6 z-20 flex flex-col gap-2 items-end">
      <AnimatePresence>
        {visible.map((note) => (
          <ToastItem key={note.id} note={note} />
        ))}
      </AnimatePresence>
    </div>
  );
}
