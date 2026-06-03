import { createBrowserRouter, Navigate } from "react-router-dom";
import { RootLayout } from "./components/RootLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LandingPage } from "./pages/LandingPage";
import { MasterTablePage } from "./pages/MasterTablePage";
import { DetailedViewPage } from "./pages/DetailedViewPage";
import { PerformanceVaultPage } from "./pages/PerformanceVaultPage";
import { useAuth } from "./context/AuthContext";

// Protected route component that redirects to login if not authenticated
function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Public only route component that redirects to terminal if already authenticated
function PublicOnlyRoute({ children }) {
    const { isAuthenticated } = useAuth();
    return !isAuthenticated ? children : <Navigate to="/terminal" replace />;
}

export const router = createBrowserRouter([
    {
        path: "/",
        Component: RootLayout,
        children: [
            { index: true, Component: LandingPage },
            {
                path: "login",
                element: (
                    <PublicOnlyRoute>
                        <LoginPage />
                    </PublicOnlyRoute>
                ),
            },
            {
                path: "register",
                element: (
                    <PublicOnlyRoute>
                        <RegisterPage />
                    </PublicOnlyRoute>
                ),
            },
            {
                path: "terminal",
                element: (
                    <ProtectedRoute>
                        <MasterTablePage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "trade/:id",
                element: (
                    <ProtectedRoute>
                        <DetailedViewPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: "vault",
                element: (
                    <ProtectedRoute>
                        <PerformanceVaultPage />
                    </ProtectedRoute>
                ),
            },
        ],
    },
]);