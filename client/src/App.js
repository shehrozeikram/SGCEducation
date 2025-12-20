import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Institutions from './pages/Institutions';
import InstitutionForm from './pages/InstitutionForm';
import Departments from './pages/Departments';
import DepartmentForm from './pages/DepartmentForm';
import Classes from './pages/Classes';
import ClassForm from './pages/ClassForm';
import Sections from './pages/Sections';
import SectionForm from './pages/SectionForm';
import Groups from './pages/Groups';
import GroupForm from './pages/GroupForm';
import Admissions from './pages/Admissions';
import AdmissionForm from './pages/AdmissionForm';
import Users from './pages/Users';
import UserForm from './pages/UserForm';
import Notifications from './pages/Notifications';
import Financial from './pages/Financial';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Calendar from './pages/Calendar';
import Messages from './pages/Messages';
import Performance from './pages/Performance';
import StudentPromotion from './pages/StudentPromotion';

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/institutions"
            element={
              <ProtectedRoute>
                <Institutions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/institutions/new"
            element={
              <ProtectedRoute>
                <InstitutionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/institutions/edit/:id"
            element={
              <ProtectedRoute>
                <InstitutionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/departments"
            element={
              <ProtectedRoute>
                <Departments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/departments/new"
            element={
              <ProtectedRoute>
                <DepartmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/departments/edit/:id"
            element={
              <ProtectedRoute>
                <DepartmentForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <Classes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes/new"
            element={
              <ProtectedRoute>
                <ClassForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes/edit/:id"
            element={
              <ProtectedRoute>
                <ClassForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sections"
            element={
              <ProtectedRoute>
                <Sections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sections/new"
            element={
              <ProtectedRoute>
                <SectionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sections/edit/:id"
            element={
              <ProtectedRoute>
                <SectionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <Groups />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/new"
            element={
              <ProtectedRoute>
                <GroupForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/edit/:id"
            element={
              <ProtectedRoute>
                <GroupForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-promotion"
            element={
              <ProtectedRoute>
                <StudentPromotion />
              </ProtectedRoute>
            }
          />
          {/* Admissions Routes */}
          <Route
            path="/admissions"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/reports"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/register"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/analytics"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/students/search"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/students/search-all"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/students/search-family"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/students/status"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/students/import"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/students/bulk-signup"
            element={
              <ProtectedRoute>
                <Admissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/new"
            element={
              <ProtectedRoute>
                <AdmissionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/edit/:id"
            element={
              <ProtectedRoute>
                <AdmissionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admissions/view/:id"
            element={
              <ProtectedRoute>
                <AdmissionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/new"
            element={
              <ProtectedRoute>
                <UserForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/edit/:id"
            element={
              <ProtectedRoute>
                <UserForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial"
            element={
              <ProtectedRoute>
                <Financial />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute>
                <Performance />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
