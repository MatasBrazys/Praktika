import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FormList from './pages/admin/FormList';
import FormBuilder from './pages/admin/FormBuilder';
import SubmissionList from './pages/admin/SubmissionList';
import UserFormsPage from './pages/public/FormList.tsx';  
import PublicForm from './pages/public/Form.tsx';
import SuccessPage from './pages/public/Success.tsx';
import Home from './pages/Home.tsx';

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