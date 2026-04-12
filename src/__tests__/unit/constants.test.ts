// vi.mock is hoisted by Vitest above all imports.
// We must mock 'three' here because constants.ts calls
// `new THREE.Box3(new THREE.Vector3(...), ...)` at module evaluation time.
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  const vec3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
  const MockBox3 = vi.fn().mockImplementation((min?: ReturnType<typeof vec3>, max?: ReturnType<typeof vec3>) => ({
    min: min ?? vec3(),
    max: max ?? vec3(),
    intersectsBox: vi.fn().mockReturnValue(false),
    setFromCenterAndSize: vi.fn().mockReturnThis(),
  }));
  const MockVector3 = vi.fn().mockImplementation((x = 0, y = 0, z = 0) => vec3(x, y, z));
  const MockMaterial = vi.fn().mockImplementation(() => ({}));
  const MockGeometry = vi.fn().mockImplementation(() => ({}));
  return {
    ...actual,
    Box3: MockBox3,
    Vector3: MockVector3,
    MeshStandardMaterial: MockMaterial,
    MeshBasicMaterial: MockMaterial,
    Color: vi.fn().mockImplementation(() => ({})),
    SphereGeometry: MockGeometry,
    ConeGeometry: MockGeometry,
    Ray: vi.fn().mockImplementation(() => ({})),
    AdditiveBlending: 2,
    DoubleSide: 2,
  };
});

// Dynamic import is required here: vi.mock is hoisted but a static import
// would run before the mock factory, so we use await import() instead.
const { getDeterministicColor, OFFICE_COLORS, COLLISION_BOXES } = await import('../../constants');

describe('getDeterministicColor', () => {
  it('returns the same color for the same name on repeated calls', () => {
    expect(getDeterministicColor('Dwight')).toBe(getDeterministicColor('Dwight'));
  });

  it('always returns a value that exists in OFFICE_COLORS', () => {
    for (const name of ['Jim', 'Pam', 'Michael', 'Dwight', 'Angela', 'Kevin', 'Oscar', 'Stanley']) {
      expect(OFFICE_COLORS).toContain(getDeterministicColor(name));
    }
  });

  it('empty string → OFFICE_COLORS[0] (hash stays 0, index = 0 % length = 0)', () => {
    expect(getDeterministicColor('')).toBe(OFFICE_COLORS[0]);
  });

  it('does not throw on unicode input', () => {
    expect(() => getDeterministicColor('ñoño')).not.toThrow();
    expect(OFFICE_COLORS).toContain(getDeterministicColor('ñoño'));
  });

  it('matches the manual hash algorithm for a known input', () => {
    // Algorithm: for each char, hash = charCode + ((hash << 5) - hash)
    // then index = Math.abs(hash) % OFFICE_COLORS.length
    const name = 'ab';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const expected = OFFICE_COLORS[Math.abs(hash) % OFFICE_COLORS.length];
    expect(getDeterministicColor(name)).toBe(expected);
  });

  it('returns different colors for at least some different names', () => {
    // Not guaranteed for all pairs (hash collision possible), but the whole set
    // of colors should appear across enough names — spot-check that not all are equal
    const colors = new Set(
      ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve', 'Frank', 'Grace', 'Heidi'].map(getDeterministicColor)
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('COLLISION_BOXES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(COLLISION_BOXES)).toBe(true);
    expect(COLLISION_BOXES.length).toBeGreaterThan(0);
  });
});

describe('OFFICE_COLORS', () => {
  it('contains 8 unique hex color strings', () => {
    expect(OFFICE_COLORS).toHaveLength(8);
    for (const color of OFFICE_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(new Set(OFFICE_COLORS).size).toBe(8);
  });
});
