import { RootLayout } from "./components/RootLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LandingPage } from "./pages/LandingPage";
import { MasterTablePage } from "./pages/MasterTablePage";
import { DetailedViewPage } from "./pages/DetailedViewPage";
import { PerformanceVaultPage } from "./pages/PerformanceVaultPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminLogsPage } from "./pages/AdminLogsPage";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
// Protected route - redirects to login if not authenticated
function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Loading...</div>;
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Public only route - redirects to terminal if already authenticated
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Loading...</div>;
  }
  return !isAuthenticated ? children : <Navigate to="/terminal" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route element={<RootLayout />}>
          <Route path="/terminal" element={<ProtectedRoute><MasterTablePage /></ProtectedRoute>} />
          <Route path="/trade/:id" element={<ProtectedRoute><DetailedViewPage /></ProtectedRoute>} />
          <Route path="/vault" element={<ProtectedRoute><PerformanceVaultPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin/logs" element={<ProtectedRoute><AdminLogsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}