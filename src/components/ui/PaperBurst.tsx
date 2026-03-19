import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/useGameStore';

interface Particle {
  id: number;
  x: number;   // horizontal offset from center (px)
  delay: number;
}

export const PaperBurst = () => {
  const lastPaperEarnedAt = useGameStore((state) => state.lastPaperEarnedAt);
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevTimestamp = useRef(0);

  useEffect(() => {
    if (!lastPaperEarnedAt || lastPaperEarnedAt === prevTimestamp.current) return;
    prevTimestamp.current = lastPaperEarnedAt;

    const burst: Particle[] = Array.from({ length: 6 }, (_, i) => ({
      id: lastPaperEarnedAt + i,
      x: (Math.random() - 0.5) * 160,
      delay: i * 0.06,
    }));
    setParticles((prev) => [...prev, ...burst]);

    const timeout = setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !burst.find((b) => b.id === p.id)));
    }, 2200);
    return () => clearTimeout(timeout);
  }, [lastPaperEarnedAt]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute select-none text-xl"
            style={{ bottom: 140, left: `calc(50% + ${p.x}px)`, translateX: '-50%' }}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -220, scale: 1.3 }}
            exit={{}}
            transition={{ duration: 1.8, ease: [0.2, 0.8, 0.4, 1], delay: p.delay }}
          >
            📄
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
