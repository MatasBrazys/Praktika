import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FormList from './pages/admin/FormListPage';
import FormBuilder from './pages/admin/FormBuilderPage';
import SubmissionList from './pages/admin/SubmissionListPage';
import UserFormsPage from './pages/public/UserFormsPage';  
import PublicForm from './pages/public/PublicFormPage';
import SuccessPage from './pages/public/SuccessPage';
import Home from './pages/HomePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Home />} />
        
        {/* Admin routes */}
        <Route path="/admin/forms" element={<FormList />} />
        <Route path="/admin/form-builder" element={<FormBuilder />} />
        <Route path="/admin/form-builder/:id" element={<FormBuilder />} />
        <Route path="/admin/forms/:id/submissions" element={<SubmissionList />} />
        
        {/* User routes */}
        <Route path="/user/forms" element={<UserFormsPage />} />  
        <Route path="/user/forms/:id" element={<PublicForm />} />
        <Route path="/user/forms/:id/success" element={<SuccessPage />} />
        <Route path="/user/submissions" element={<div>My Submissions - Coming Soon</div>} />
      </Routes>
    </BrowserRouter>
  );
}