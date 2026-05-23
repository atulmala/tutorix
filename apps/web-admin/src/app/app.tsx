import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from './auth/useAdminAuth';
import { RequireAdmin } from './auth/RequireAdmin';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TutorsPage } from './pages/TutorsPage';
import { StudentsPage } from './pages/StudentsPage';

export function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tutors" element={<TutorsPage />} />
          <Route path="students" element={<StudentsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}

export default App;
