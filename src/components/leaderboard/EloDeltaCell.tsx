export default function EloDeltaCell({ delta }: { delta: number }) {
  if (delta > 0)
    return (
      <span
        className={`
          font-semibold text-green-600
          dark:text-green-400
        `}
      >
        +{delta}
      </span>
    );
  if (delta < 0)
    return (
      <span
        className={`
          font-semibold text-red-500
          dark:text-red-400
        `}
      >
        {delta}
      </span>
    );
  return <span className="text-gray-400">±0</span>;
}
