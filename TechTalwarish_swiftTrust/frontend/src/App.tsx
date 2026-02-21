import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import AuthPage   from './pages/AuthPage';
import MapPage    from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import AdminPage  from './pages/AdminPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-950 text-white">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/*" element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/"       element={<MapPage />} />
                  <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
                  <Route path="/admin"  element={<AdminRoute><AdminPage /></AdminRoute>} />
                </Routes>
              </>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
