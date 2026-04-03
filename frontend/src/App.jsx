import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import Goals from "@/pages/Goals";
import Notes from "@/pages/Notes";
import Planner from "@/pages/Planner";
import PlaceholderPage from "@/pages/PlaceholderPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import ClerkBridge from "@/components/ClerkBridge";
import DashboardShell from "@/components/layout/DashboardShell";

const placeholderRoutes = [
  {
    path: "social",
    title: "Social Hub",
    week: "Week 4",
    description: "Cross-platform social memory and content workflows are planned for Week 4.",
  },
  {
    path: "debate",
    title: "Debate Arena",
    week: "Week 5",
    description: "The debate engine will arrive with adversarial reasoning modes in Week 5.",
  },
  {
    path: "settings",
    title: "Settings",
    week: "Week 5",
    description: "Advanced model controls and workspace preferences are scheduled for Week 5.",
  },
];

function App() {
  return (
    <>
      <ClerkBridge />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="memory" element={<Dashboard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="goals" element={<Goals />} />
            <Route path="notes" element={<Notes />} />
            <Route path="planner" element={<Planner />} />
            {placeholderRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <PlaceholderPage
                    title={route.title}
                    week={route.week}
                    description={route.description}
                  />
                }
              />
            ))}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#13131a",
            color: "#f0f0ff",
            border: "1px solid rgba(255,255,255,0.06)",
          },
        }}
      />
    </>
  );
}

export default App;
