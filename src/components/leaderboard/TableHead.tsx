function SortIndicator({ sortKey, current }: { sortKey: string; current: { key: string; dir: 'asc' | 'desc' } }) {
  // Only the actively-sorted column shows an arrow; inactive columns stay clean.
  if (current.key !== sortKey) return null;
  return current.dir === 'asc' ? <>&#9650;</> : <>&#9660;</>;
}

export default function TableHead({
  columns,
  current,
  onToggle,
  showForm,
}: {
  columns: { key: string; label: string; align: 'left' | 'right' }[];
  current: { key: string; dir: 'asc' | 'desc' };
  onToggle: (key: string) => void;
  showForm: boolean;
}) {
  return (
    <thead>
      <tr>
        {columns.map((col) => (
          <th
            key={col.key}
            className={`
              px-2 py-2.5 text-xs font-semibold tracking-wide text-gray-400 uppercase
              dark:text-gray-500
              ${col.align === 'left' ? 'text-left' : 'text-right'}
              ${
                col.key === 'name'
                  ? `
                    sticky left-0 z-10 bg-white
                    dark:bg-gray-900
                  `
                  : ''
              }
            `}
          >
            {col.key === 'name' ? (
              <span>{col.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onToggle(col.key)}
                className="flex w-full items-center justify-end gap-1 whitespace-nowrap"
              >
                <span>{col.label}</span> <SortIndicator sortKey={col.key} current={current} />
              </button>
            )}
          </th>
        ))}
        {showForm && (
          <th
            className={`
              px-2 py-2.5 text-right text-xs font-semibold tracking-wide text-gray-400 uppercase
              dark:text-gray-500
            `}
          >
            Form
          </th>
        )}
      </tr>
    </thead>
  );
}
