// Debug control for the pest overlay. Pest state is a *set* of causes, not one choice, so this is a
// row of independent toggles rather than a DebugSelect — every combination is reachable, including the
// 2+-cause escalations that add firewasps. "auto" hands control back to the computed state.

import { PEST_CAUSE_KIND, PEST_NAMES, PEST_ROWS } from '@/constants/garden.ts';
import type { PestCause } from '@/utils/garden.ts';

interface Props {
  label: string;
  // null = auto (follow the computed causes); an array = override, [] meaning a healthy tree
  value: PestCause[] | null;
  computed: PestCause[];
  onChange: (value: PestCause[] | null) => void;
}

export default function DebugCauses({ label, value, computed, onChange }: Props) {
  const active = value ?? computed;
  const isAuto = value == null;

  const toggle = (cause: PestCause) =>
    onChange(active.includes(cause) ? active.filter((c) => c !== cause) : [...active, cause]);

  return (
    <div
      className={`
        flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-gray-600
        dark:text-gray-300
      `}
    >
      <span className="w-16 shrink-0">{label}</span>
      {/* title names the species each cause summons, so the toggles are self-documenting */}
      {PEST_ROWS.map(({ cause }) => (
        <label
          key={cause}
          className="flex cursor-pointer items-center gap-1"
          title={PEST_NAMES[PEST_CAUSE_KIND[cause]]}
        >
          <input
            type="checkbox"
            checked={active.includes(cause)}
            onChange={() => toggle(cause)}
            className="cursor-pointer accent-orange-500"
          />
          <span>{cause}</span>
        </label>
      ))}
      {/* Label stays the bare word so the row fits on one line — the panel's `pests` readout above
          already spells out the computed causes, so repeating them here would only wrap the row. */}
      <button
        type="button"
        onClick={() => onChange(isAuto ? [] : null)}
        title={`auto (${computed.length > 0 ? computed.join(' + ') : 'healthy'})`}
        className={`
          shrink-0 cursor-pointer rounded border px-1.5 py-0.5
          ${
            isAuto
              ? `
                border-orange-400 bg-orange-100 font-semibold text-orange-700
                dark:border-orange-600 dark:bg-orange-900/40 dark:text-orange-300
              `
              : `
                border-gray-300 bg-white text-gray-500
                hover:bg-gray-100
                dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
              `
          }
        `}
      >
        auto
      </button>
    </div>
  );
}
