import React from 'react';
import { Box } from '@react-three/drei';

const BOOK_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#e67e22', '#2c3e50'];

interface BookshelfProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export const Bookshelf = ({ position, rotation = [0, 0, 0] }: BookshelfProps) => {
  // Shelf Y positions (local to group): bottom shelf ~0.4, middle ~0.95, top ~1.5
  const shelfYPositions = [0.4, 0.95, 1.5];

  return (
    <group position={position} rotation={rotation}>
      {/* Tall frame */}
      <Box args={[1.2, 2.2, 0.3]} position={[0, 1.1, 0]}>
        <meshStandardMaterial color="#5D4037" />
      </Box>

      {/* 3 horizontal shelves */}
      {shelfYPositions.map((y, i) => (
        <Box key={i} args={[1.1, 0.05, 0.28]} position={[0, y, 0]}>
          <meshStandardMaterial color="#6D4C41" />
        </Box>
      ))}

      {/* Books on each shelf */}
      {shelfYPositions.map((shelfY, shelfIdx) => {
        const books = [
          { x: -0.44, height: 0.26, color: BOOK_COLORS[(shelfIdx * 6 + 0) % BOOK_COLORS.length] },
          { x: -0.28, height: 0.22, color: BOOK_COLORS[(shelfIdx * 6 + 1) % BOOK_COLORS.length] },
          { x: -0.12, height: 0.28, color: BOOK_COLORS[(shelfIdx * 6 + 2) % BOOK_COLORS.length] },
          { x: 0.04,  height: 0.24, color: BOOK_COLORS[(shelfIdx * 6 + 3) % BOOK_COLORS.length] },
          { x: 0.20,  height: 0.25, color: BOOK_COLORS[(shelfIdx * 6 + 4) % BOOK_COLORS.length] },
          { x: 0.36,  height: 0.22, color: BOOK_COLORS[(shelfIdx * 6 + 5) % BOOK_COLORS.length] },
        ];
        return books.map((book, bookIdx) => (
          <Box
            key={`${shelfIdx}-${bookIdx}`}
            args={[0.1, book.height, 0.22]}
            position={[book.x, shelfY + book.height / 2 + 0.025, 0]}
          >
            <meshStandardMaterial color={book.color} />
          </Box>
        ));
      })}
    </group>
  );
};
