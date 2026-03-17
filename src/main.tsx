import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './pages/index';
import Present from './pages/present';
import Presenter from './pages/presenter';
import Print from './pages/print';
import './variables.css';
import './cmdk.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/present" element={<Present />} />
        <Route path="/presenter" element={<Presenter />} />
        <Route path="/print" element={<Print />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);
