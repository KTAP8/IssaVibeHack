import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import GenerateReply from '@/pages/GenerateReply';
import AutoImprove from '@/pages/AutoImprove';
import ManualUpdate from '@/pages/ManualUpdate';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/generate-reply" replace />} />
        <Route path="/generate-reply" element={<GenerateReply />} />
        <Route path="/improve-ai" element={<AutoImprove />} />
        <Route path="/improve-ai-manually" element={<ManualUpdate />} />
      </Routes>
    </Layout>
  );
}

export default App;
