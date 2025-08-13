// src/App.tsx
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { Header } from './components/Header';
import { Auth } from './components/Auth';
import { ErrorNotification } from './components/ErrorNotification';
import { Repositories } from './components/Repositories';
import { RepoDetails } from './components/RepoDetails';
import { SummaryGeneration } from './components/SummaryGeneration';
import { TestGeneration } from './components/TestGeneration';

// A simple dashboard component that provides the main layout for authenticated users
function DashboardLayout() {
  const { user } = useAuth();
  if (!user) {
    // This is a basic way to handle unauthenticated access. 
    // In a real app, you might use a dedicated PrivateRoute component.
    return <Auth />;
  }
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <ErrorNotification />
        {/* The Outlet component will render the nested route's component */}
        <Outlet />
      </main>
    </>
  );
}

// Main App component
export default function App() {
  return (
    <ErrorProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route for the login page */}
            <Route path="/" element={<Auth />} />

            {/* A nested route structure for the authenticated part of the application */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Repositories />} /> {/* Default route for /dashboard */}
              <Route path="repositories" element={<Repositories />} />
              <Route path="repositories/:owner/:repoName" element={<RepoDetails />} />
              <Route path="generate-summaries" element={<SummaryGeneration />} />
              <Route path="generate-tests" element={<TestGeneration />} />
            </Route>

            {/* A catch-all for any unknown routes */}
            <Route path="*" element={<h1 className="text-center mt-20 text-3xl font-bold">404: Not Found</h1>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorProvider>
  );
}
