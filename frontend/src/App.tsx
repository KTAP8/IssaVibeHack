import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';
import GenerateReply from '@/pages/GenerateReply';
import AutoImprove from '@/pages/AutoImprove';
import ManualUpdate from '@/pages/ManualUpdate';
import Login from '@/pages/Login';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = () => {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Layout><Outlet /></Layout>;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/generate-reply" replace />} />
          <Route path="/generate-reply/:sessionId?" element={<GenerateReply />} />
          <Route path="/improve-ai" element={<AutoImprove />} />
          <Route path="/improve-ai-manually" element={<ManualUpdate />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
