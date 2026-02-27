import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { motion } from 'motion/react';

export const ChatBubble = ({ text, time }: { text?: string, time?: number }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (text && time) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [text, time]);

  if (!visible || !text) return null;

  return (
    <Html position={[0, 2.8, 0]} center>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 10 }}
        className="bg-white px-3 py-2 rounded-xl shadow-xl border-2 border-indigo-500 min-w-[100px] text-center"
      >
        <p className="text-black text-xs font-bold whitespace-nowrap">{text}</p>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r-2 border-b-2 border-indigo-500 rotate-45"></div>
      </motion.div>
    </Html>
  );
};
