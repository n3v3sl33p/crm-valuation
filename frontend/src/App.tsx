import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
    Outlet,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { LoginForm } from "./components/shared/LoginForm";
import { RegisterForm } from "./components/shared/RegistrationForm";
import { DashboardLayout } from "./components/layouts/DashboardLayout";
import { Applications } from "./pages/Applications";
import { Calls } from "./pages/Calls";
import { ValuationDetail } from "./pages/ValuationDetail";
import { Profile } from "./pages/Profile";

function App() {
    return (
        <>
            <Toaster position="top-right" />
            <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />

                <Route
                    path="/dashboard"
                    element={
                        <DashboardLayout>
                            <Outlet />
                        </DashboardLayout>
                    }
                >
                    <Route
                        index
                        element={<Navigate to="applications" replace />}
                    />
                    <Route path="applications" element={<Applications />} />
                    <Route
                        path="applications/:id"
                        element={<ValuationDetail />}
                    />
                    <Route path="calls" element={<Calls />} />
                    <Route path="profile" element={<Profile />} />
                </Route>

                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
        </>
    );
}

export default App;
