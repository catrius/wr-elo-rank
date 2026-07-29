export default function DividerRow({ label, colSpan }: { label: string; colSpan: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={`
          border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-center text-[11px] font-semibold tracking-wide
          text-gray-400 uppercase
          dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-500
        `}
      >
        {label}
      </td>
    </tr>
  );
}
