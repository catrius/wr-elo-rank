import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DisplayNameProvider } from '@/contexts/DisplayNameContext.tsx';
import IngameToggle from '@/components/IngameToggle.tsx';
import './index.css';
import App from './App.tsx';
import PlayerPage from './pages/PlayerPage.tsx';
import SeasonPage from './pages/SeasonPage.tsx';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <DisplayNameProvider>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/players/:id" element={<PlayerPage />} />
        <Route path="/season/:id" element={<SeasonPage />} />
      </Routes>
      <IngameToggle />
    </DisplayNameProvider>
  </BrowserRouter>,
);
