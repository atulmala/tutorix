import { Navigate, Route, Routes } from 'react-router-dom';
import { AnalyticsViewTracker } from '../components/AnalyticsViewTracker';
import { AdminAuthProvider } from './auth/useAdminAuth';
import { RequireAdmin } from './auth/RequireAdmin';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TutorsPage } from './pages/TutorsPage';
import { TutorDetailPage } from './pages/TutorDetailPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { ProficiencyTestsPage } from './pages/ProficiencyTestsPage';
import { ProficiencyTestDetailPage } from './pages/ProficiencyTestDetailPage';
import { FeesAndChargesPage } from './pages/FeesAndChargesPage';

export function App() {
  return (
    <AdminAuthProvider>
      <AnalyticsViewTracker />
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
          <Route path="tutors/:tutorId" element={<TutorDetailPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/:studentId" element={<StudentDetailPage />} />
          <Route path="proficiency-tests" element={<ProficiencyTestsPage />} />
          <Route path="proficiency-tests/:testId" element={<ProficiencyTestDetailPage />} />
          <Route path="fees-and-charges" element={<FeesAndChargesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}

export default App;
