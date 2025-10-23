function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full bg-white/70 px-2 py-1 text-xs font-medium ring-1 ring-gray-200 ring-inset
        dark:bg-gray-800/50 dark:ring-gray-700
      `}
    >
      {children}
    </span>
  );
}

export default Pill;
