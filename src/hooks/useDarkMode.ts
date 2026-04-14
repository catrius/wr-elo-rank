import { useState, useLayoutEffect } from 'react';

export default function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggleDark = () => setDark((d) => !d);

  return { dark, toggleDark };
}
