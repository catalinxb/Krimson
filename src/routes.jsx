import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { MasterTablePage } from "./pages/MasterTablePage";
import { DetailedViewPage } from "./pages/DetailedViewPage";
import { PerformanceVaultPage } from "./pages/PerformanceVaultPage";

export const router = createBrowserRouter([
    {
        path: "/",
        Component: RootLayout,
        children: [
            { index: true, Component: LandingPage },
            { path: "login", Component: LoginPage },
            { path: "terminal", Component: MasterTablePage },
            { path: "trade/:id", Component: DetailedViewPage },
            { path: "vault", Component: PerformanceVaultPage },
        ],
    },
]);