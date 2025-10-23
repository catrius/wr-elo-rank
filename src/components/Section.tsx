import React from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

function Section({ title, children, actions = null }: Props) {
  return (
    <section
      className={`
        rounded-2xl border border-gray-100 bg-white p-4 shadow-sm
        md:p-6
        dark:border-gray-800 dark:bg-gray-900
      `}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2
          className={`
            text-lg font-semibold tracking-tight
            md:text-xl
          `}
        >
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default Section;
