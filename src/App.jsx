import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedLayout from "./layouts/ProtectedLayout";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import PayrollRunPage from "./pages/PayrollRunPage";
import ProcessingPage from "./pages/ProcessingPage";
import { useAuth } from "./store/AuthContext";

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedLayout isAuthenticated={isAuthenticated} />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/runs/:id/processing" element={<ProcessingPage />} />
        <Route path="/runs/:id" element={<PayrollRunPage />} />
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
