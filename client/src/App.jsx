import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Executions from './pages/Executions';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import WorkflowEditor from './pages/WorkflowEditor';
import NotFound from './pages/NotFound';


function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0D0C] text-[#F5F0E6] selection:bg-[#E5B45B]/25 selection:text-[#E5B45B]">
      <Navbar />
      <main className="flex-grow w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Website Routes */}
          <Route
            path="/"
            element={
              <PublicLayout>
                <Home />
              </PublicLayout>
            }
          />
          <Route
            path="/login"
            element={
              <PublicLayout>
                <Login />
              </PublicLayout>
            }
          />
          <Route
            path="/register"
            element={
              <PublicLayout>
                <Register />
              </PublicLayout>
            }
          />

          {/* Authenticated Dashboard Route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Authenticated Execution History Route */}
          <Route
            path="/executions"
            element={
              <ProtectedRoute>
                <Executions />
              </ProtectedRoute>
            }
          />

          {/* Authenticated Blueprint Templates Route */}
          <Route
            path="/templates"
            element={
              <ProtectedRoute>
                <Templates />
              </ProtectedRoute>
            }
          />

          {/* Authenticated Workspace Settings Route */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />


          {/* Authenticated Workflow Builder Routes */}
          <Route
            path="/workflows/new"
            element={
              <ProtectedRoute>
                <WorkflowEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workflows/:id"
            element={
              <ProtectedRoute>
                <WorkflowEditor />
              </ProtectedRoute>
            }
          />

          {/* 404 Route */}
          <Route
            path="*"
            element={
              <PublicLayout>
                <NotFound />
              </PublicLayout>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
