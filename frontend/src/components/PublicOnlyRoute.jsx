import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function PublicOnlyRoute({ children }) {
  const { isLoading, user } = useAuth();
  if (isLoading) return <main className="brand-route-loading"><span /><p>Preparing Futurion…</p></main>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default PublicOnlyRoute;
