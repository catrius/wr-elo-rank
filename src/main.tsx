import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DisplayNameProvider } from '@/contexts/DisplayNameContext.tsx';
import { AuthProvider } from '@/contexts/AuthContext.tsx';
import ToolMenu from '@/components/ToolMenu.tsx';
import './index.css';
import App from './App.tsx';
import PlayerPage from './pages/PlayerPage.tsx';
import SeasonPage from './pages/SeasonPage.tsx';
import UserPage from './pages/UserPage.tsx';
import WrappedPage from './pages/WrappedPage.tsx';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <DisplayNameProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/players/:id" element={<PlayerPage />} />
          <Route path="/season/:id" element={<SeasonPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/wrapped/:id" element={<WrappedPage />} />
        </Routes>
        <ToolMenu />
      </DisplayNameProvider>
    </AuthProvider>
  </BrowserRouter>,
);
