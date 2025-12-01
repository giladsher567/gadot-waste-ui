import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { NewRequestPage } from './pages/NewRequest';
import { RequestsBoardPage } from './pages/RequestsBoard';
import { Truck, ClipboardList, PlusCircle } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav style={{
      background: '#ffffff',
      color: '#000000',
      padding: '1rem',
      borderBottom: '1px solid #e0e0e0',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div className="container flex justify-between items-center" style={{ padding: 0 }}>
        <div className="flex items-center gap-sm">
          <Truck size={24} />
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Gadot Waste</span>
        </div>
        <div className="flex gap-md">
          <Link to="/requests" style={{
            color: '#000000',
            textDecoration: 'none',
            opacity: isActive('/requests') ? 1 : 0.7,
            fontWeight: isActive('/requests') ? 'bold' : 'normal',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <ClipboardList size={18} />
            לוח פניות
          </Link>
          <Link to="/new-request" style={{
            color: '#000000',
            textDecoration: 'none',
            opacity: isActive('/new-request') ? 1 : 0.7,
            fontWeight: isActive('/new-request') ? 'bold' : 'normal',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <PlusCircle size={18} />
            פנייה חדשה
          </Link>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main style={{ padding: '20px 0' }}>
          <Routes>
            <Route path="/new-request" element={<NewRequestPage />} />
            <Route path="/requests" element={<RequestsBoardPage />} />
            <Route path="/" element={<NewRequestPage />} /> {/* Default to new request for field agents? Or board? Let's default to new request as per "Mobile-first for field agents" implication, or maybe redirect. */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
