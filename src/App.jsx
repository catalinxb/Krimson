import { RootLayout } from "./components/RootLayout";
import { AuthPage } from "./pages/AuthPage";
import { LandingPage } from "./pages/LandingPage";
import { MasterTablePage } from "./pages/MasterTablePage";
import { DetailedViewPage } from "./pages/DetailedViewPage";
import { PerformanceVaultPage } from "./pages/PerformanceVaultPage";
import { ProfilePage } from "./pages/ProfilePage";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./components/PageTransition";

export default function App() {
  const location = useLocation();

  return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
          <Route path="/login" element={<PageTransition><AuthPage /></PageTransition>} />
          <Route element={<RootLayout />}>
            <Route path="/terminal" element={<PageTransition><MasterTablePage /></PageTransition>} />
            <Route path="/trade/:id" element={<PageTransition><DetailedViewPage /></PageTransition>} />
            <Route path="/vault" element={<PageTransition><PerformanceVaultPage /></PageTransition>} />
            <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
          </Route>
        </Routes>
      </AnimatePresence>
  );
}