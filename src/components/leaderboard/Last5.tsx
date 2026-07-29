const LAST5_KEYS = ['k0', 'k1', 'k2', 'k3', 'k4'] as const;

export default function Last5({ results }: { results: ('W' | 'L')[] }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {results.map((r, i) =>
        r === 'W' ? (
          <span
            key={LAST5_KEYS[i]}
            className={`
              flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white
            `}
          >
            ✓
          </span>
        ) : (
          <span
            key={LAST5_KEYS[i]}
            className={`
              flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white
            `}
          >
            ✕
          </span>
        ),
      )}
    </div>
  );
}
