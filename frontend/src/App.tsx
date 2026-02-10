// frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FormList from './components/admin/FormList';
import FormBuilder from './components/admin/FormBuilder';
import SubmissionList from './components/admin/SubmissionList';
import PublicForm from './components/public/PublicForm';
import SuccessPage from './components/public/SuccessPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/admin/forms" replace />} />
        
        {/* Admin routes */}
        <Route path="/admin/forms" element={<FormList />} />
        <Route path="/admin/form-builder" element={<FormBuilder />} />
        <Route path="/admin/form-builder/:id" element={<FormBuilder />} />
        <Route path="/admin/forms/:id/submissions" element={<SubmissionList />} />
        
        {/* Public routes */}
        <Route path="/forms/:id" element={<PublicForm />} />
        <Route path="/forms/:id/success" element={<SuccessPage />} />
      </Routes>
    </BrowserRouter>
  );
}