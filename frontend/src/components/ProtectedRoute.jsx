import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function ProtectedRoute({ children, roles }) {
  const location = useLocation();
  const { isLoading, networkError, refreshUser, user } = useAuth();

  if (isLoading) {
    return <main className="brand-route-loading"><span /><p>Restoring your Futurion session…</p></main>;
  }

  if (networkError) {
    return (
      <main className="protected-network-state">
        <div>
          <p className="eyebrow">Connection interrupted</p>
          <h1 className="mt-3 font-serif text-3xl">We couldn’t confirm your session.</h1>
          <p className="mt-3 text-sm leading-6 text-[#637575]">{networkError}</p>
          <button type="button" className="primary-button mt-6" onClick={refreshUser}>Try again</button>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
