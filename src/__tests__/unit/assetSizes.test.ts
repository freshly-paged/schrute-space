import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, it, expect } from 'vitest';

const MAX_MODEL_SIZE_BYTES = 32 * 1024 * 1024; // 32 MB

function findGlbFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findGlbFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.glb')) {
      results.push(fullPath);
    }
  }
  return results;
}

const assetsDir = resolve(__dirname, '../../../public/assets');
const glbFiles = findGlbFiles(assetsDir);

describe('3D model asset sizes', () => {
  it('should have at least one .glb file in public/assets', () => {
    expect(glbFiles.length).toBeGreaterThan(0);
  });

  for (const filePath of glbFiles) {
    it(`${filePath.split('/public/assets/')[1]} must be under 32 MB`, () => {
      const { size } = statSync(filePath);
      const sizeMB = (size / (1024 * 1024)).toFixed(2);
      expect(size, [
        `Model file is too large: ${filePath.split('/public/assets/')[1]} is ${sizeMB} MB (limit: 32 MB).`,
        `Large assets break deployment. Please compress the file before committing.`,
        `Try https://optimizeglb.com/ to reduce the file size.`,
      ].join('\n')).toBeLessThanOrEqual(MAX_MODEL_SIZE_BYTES);
    });
  }
});
