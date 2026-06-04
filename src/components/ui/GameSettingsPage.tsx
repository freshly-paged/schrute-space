import { motion } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';

interface GameSettingsPageProps {
  onClose: () => void;
}

export const GameSettingsPage = ({ onClose }: GameSettingsPageProps) => {
  const notificationsEnabled = useGameStore((s) => s.notificationsEnabled);
  const toggleNotificationsEnabled = useGameStore((s) => s.toggleNotificationsEnabled);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center font-pixel"
      style={{ background: '#3d2b1f' }}
    >
      {/* Beet watermark */}
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden flex items-center justify-center">
        <span style={{ fontSize: 320, lineHeight: 1 }}>🦫</span>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 pixel-panel max-w-md w-full"
      >
        {/* Header band */}
        <div className="px-4 py-3" style={{ background: 'var(--color-schrute)' }}>
          <div className="text-white text-[8px] uppercase tracking-widest">DUNDER MIFFLIN</div>
          <div className="text-[10px] font-bold text-white uppercase mt-0.5">Office Settings</div>
        </div>

        <div className="p-6 space-y-6">
          {/* Notifications section */}
          <div>
            <div className="text-[8px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-ink-faint)' }}>
              Notifications
            </div>
            <hr className="memo-rule mb-3" />
            <div
              className="flex items-center justify-between gap-4 px-3 py-2"
              style={{ border: '2px solid var(--color-ink)', background: 'var(--color-paper-dark, #f5f0e8)' }}
            >
              <div className="text-left">
                <div className="text-[8px] font-bold uppercase">Office Alerts</div>
                <div className="text-[7px] leading-snug mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                  Toast alerts when players join, leave, chat, or get kicked.
                </div>
              </div>
              <button
                onClick={toggleNotificationsEnabled}
                className="pixel-button text-[8px] uppercase shrink-0"
                style={{
                  background: notificationsEnabled ? '#166534' : 'var(--color-ink)',
                  padding: '4px 10px',
                  color: '#fff',
                }}
              >
                {notificationsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Close button */}
          <div className="text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-[8px] text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-widest"
            >
              ← Close Settings
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
