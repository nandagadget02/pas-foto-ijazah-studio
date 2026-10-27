import fs from 'fs';
const p = 'src/components/PrinterCompensationPanel.tsx';
let content = fs.readFileSync(p, 'utf8');

const searchBlock = `

interface TonalControlRowProps {
  label: string;
  sublabel: string;
  description: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  accent: 'sky' | 'amber' | 'rose' | 'emerald' | 'cyan';
  onChange: (val: number) => void;
}

/**
 * Kontrol baris untuk kontrol highlight, brightness, white point, dan garment detail
 */
const TonalControlRow: React.FC<TonalControlRowProps> = ({
  label,
  sublabel,
  description,
  value,
  min,
  max,
  disabled,
  accent,
  onChange,
}) => {
  const handleStep = (delta: number) => {
    const nextVal = Math.max(min, Math.min(max, value + delta));
    onChange(nextVal);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    const nextVal = isNaN(raw) ? 0 : Math.max(min, Math.min(max, raw));
    onChange(nextVal);
  };

  const formattedValue =
    min < 0
      ? value > 0
        ? \`+\${value}\`
        : value < 0
        ? \`−\${Math.abs(value)}\`
        : '0'
      : \`\${value}\`;

  const accentStyles = {
    sky: {
      sliderAccent: 'accent-sky-400 hover:accent-sky-300',
      badge: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
    },
    amber: {
      sliderAccent: 'accent-amber-400 hover:accent-amber-300',
      badge: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    },
    rose: {
      sliderAccent: 'accent-rose-400 hover:accent-rose-300',
      badge: 'bg-rose-400/15 text-rose-300 border-rose-400/30',
    },
    emerald: {
      sliderAccent: 'accent-emerald-400 hover:accent-emerald-300',
      badge: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
    },
    cyan: {
      sliderAccent: 'accent-cyan-400 hover:accent-cyan-300',
      badge: 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30',
    },
  }[accent];

  return (
    <div
      className={\`border rounded-xl p-3.5 space-y-2 transition-colors \${
        disabled
          ? 'bg-slate-950/40 border-slate-900 opacity-60'
          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80'
      }\`}
    >
      <div className="flex justify-between items-center text-xs">
        <div>
          <span className="font-semibold text-slate-200">{label}</span>
          <span className="text-[10px] text-slate-400 ml-1.5 hidden sm:inline">
            ({sublabel})
          </span>
        </div>
        <span
          className={\`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors \${
            value !== 0 && !disabled
              ? accentStyles.badge
              : 'bg-slate-800 text-slate-400 border-slate-700/40'
          }\`}
        >
          {formattedValue}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <StepperButton
          type="minus"
          label={label}
          disabled={disabled || value <= min}
          onStep={() => handleStep(-1)}
        />

        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          onChange={handleSliderChange}
          aria-label={label}
          className={\`w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none \${accentStyles.sliderAccent}\`}
        />

        <StepperButton
          type="plus"
          label={label}
          disabled={disabled || value >= max}
          onStep={() => handleStep(1)}
        />
      </div>

      <p className="text-[10px] text-slate-400 leading-tight">
        {description}
      </p>
    </div>
  );
};`;

const normalizedSearch = searchBlock.replace(/\r\n/g, '\n');
const normalizedContent = content.replace(/\r\n/g, '\n');
const count = normalizedContent.split(normalizedSearch).length - 1;
console.log('Matches found:', count);
if (count > 0) {
  const restored = normalizedContent.split(normalizedSearch).join('');
  fs.writeFileSync(p, restored.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Restored successfully.');
}
