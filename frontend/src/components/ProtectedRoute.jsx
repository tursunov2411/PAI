import { useAuth } from "@clerk/clerk-react";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="glass-panel w-full max-w-md p-8 text-center">
          <p className="text-sm text-text-muted">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;

