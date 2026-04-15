import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AvatarConfig } from '../../types';
import { PixelBeet } from './LandingPage';
import { AvatarPreview } from './AvatarPreview';

const SHIRT_COLORS = [
  { label: 'Indigo',   value: '#4f46e5' },
  { label: 'Emerald',  value: '#059669' },
  { label: 'Amber',    value: '#d97706' },
  { label: 'Red',      value: '#dc2626' },
  { label: 'Violet',   value: '#7c3aed' },
  { label: 'Blue',     value: '#2563eb' },
  { label: 'Pink',     value: '#db2777' },
  { label: 'Cyan',     value: '#0891b2' },
  { label: 'Lime',     value: '#65a30d' },
  { label: 'Orange',   value: '#ea580c' },
  { label: 'Teal',     value: '#0d9488' },
  { label: 'White',    value: '#e2e8f0' },
];

const SKIN_TONES = [
  { label: 'Light',        value: '#ffdbac' },
  { label: 'Medium Light', value: '#f1c27d' },
  { label: 'Medium',       value: '#e0ac69' },
  { label: 'Medium Dark',  value: '#c68642' },
  { label: 'Dark',         value: '#8d5524' },
];

const PANT_COLORS = [
  { label: 'Charcoal', value: '#333333' },
  { label: 'Navy',     value: '#1e3a5f' },
  { label: 'Brown',    value: '#7c5c3a' },
  { label: 'Khaki',    value: '#c2a46e' },
  { label: 'Slate',    value: '#475569' },
  { label: 'Black',    value: '#111111' },
];

interface AvatarCustomizationPageProps {
  config: AvatarConfig;
  initialDisplayName: string;
  initialJobTitle: string;
  onSave: (payload: { config: AvatarConfig; displayName: string; jobTitle: string }) => void | Promise<void>;
  onBack: () => void;
}

export const AvatarCustomizationPage = ({
  config,
  initialDisplayName,
  initialJobTitle,
  onSave,
  onBack,
}: AvatarCustomizationPageProps) => {
  const [draft, setDraft] = useState<AvatarConfig>(config);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setSaving(true);
    await onSave({ config: draft, displayName: trimmed, jobTitle: jobTitle.trim() });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#3d2b1f] flex flex-col items-center justify-center p-4 font-pixel text-white overflow-hidden">
      {/* Background beets */}
      <div className="absolute inset-0 opacity-10 pointer-events-none grid grid-cols-6 gap-20 p-10">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="flex justify-center items-center">
            <PixelBeet />
          </div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 pixel-panel p-8 md:p-10 max-w-2xl w-full"
      >
        <div className="flex items-center gap-4 mb-6">
          <PixelBeet />
          <h1 className="text-xl md:text-2xl uppercase">EMPLOYEE PROFILE</h1>
        </div>

        <p className="text-[10px] text-slate-600 leading-loose mb-8">
          CUSTOMIZE YOUR APPEARANCE. REMEMBER: PROFESSIONALISM IS<br />
          MANDATORY. BEARS. BEETS. BATTLESTAR GALACTICA.
        </p>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Preview */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">PREVIEW</span>
            <div className="bg-[#cbd5e1] p-6 pixel-border">
              <AvatarPreview config={draft} width={72} height={100} />
            </div>
          </div>

          {/* Options */}
          <div className="flex-1 space-y-6">
            <Section label="DISPLAY NAME">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
                className="pixel-input w-full"
                placeholder="Name shown in-game"
                autoComplete="nickname"
              />
            </Section>
            <Section label="TITLE (OPTIONAL)">
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                maxLength={60}
                className="pixel-input w-full"
                placeholder="e.g. Assistant to the Regional Manager"
                autoComplete="organization-title"
              />
            </Section>
            <Section label="SHIRT COLOR">
              <SwatchGrid
                options={SHIRT_COLORS}
                selected={draft.shirtColor}
                onSelect={(v) => setDraft((d) => ({ ...d, shirtColor: v }))}
              />
            </Section>

            <Section label="SKIN TONE">
              <SwatchGrid
                options={SKIN_TONES}
                selected={draft.skinTone}
                onSelect={(v) => setDraft((d) => ({ ...d, skinTone: v }))}
              />
            </Section>

            <Section label="PANTS">
              <SwatchGrid
                options={PANT_COLORS}
                selected={draft.pantColor}
                onSelect={(v) => setDraft((d) => ({ ...d, pantColor: v }))}
              />
            </Section>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-8">
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="pixel-button text-xs py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'SAVING...' : 'SAVE APPEARANCE'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="text-[8px] text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-widest"
          >
            ← Back to Branch Selection
          </button>
        </div>

        <div className="mt-6 text-[8px] text-slate-400 text-center">
          © 1765 SCHRUTE FARMS. ALL RIGHTS RESERVED.
        </div>
      </motion.div>
    </div>
  );
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: 'var(--color-ink-faint)' }}>{label}</div>
      <hr className="memo-rule" />
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SwatchGrid({ options, selected, onSelect }: { options: { label: string; value: string }[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ label, value }) => (
        <button
          key={value}
          title={label}
          onClick={() => onSelect(value)}
          className="w-8 h-8 transition-all active:scale-90"
          style={{
            backgroundColor: value,
            outline: selected === value ? '3px solid #000' : '2px solid #94a3b8',
            outlineOffset: selected === value ? '2px' : '0px',
          }}
        />
      ))}
    </div>
  );
}

