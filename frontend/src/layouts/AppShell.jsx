import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import BrandLogo from "../components/brand/BrandLogo.jsx";
import Icon from "../components/ui/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const studentNavigation = [
  { to: "/dashboard", label: "Overview", icon: "overview", end: true },
  { to: "/profile", label: "Student Profile", icon: "profile" },
  { to: "/dashboard/skills", label: "Skill Intelligence", icon: "skills" },
  { to: "/dashboard/careers", label: "Career Discovery", icon: "careers" },
  { to: "/dashboard/career-comparison", label: "Career Comparison", icon: "compare" },
  { to: "/dashboard/learning", label: "Learning Resources", icon: "learning" },
  { to: "/dashboard/roadmaps", label: "Career Roadmaps", icon: "roadmap" },
  { to: "/dashboard/opportunities", label: "Opportunities", icon: "opportunities" },
  { to: "/dashboard/progress", label: "Career Progress", icon: "progress" },
  { to: "/dashboard/portfolio", label: "Career Portfolio", icon: "portfolio" },
  { to: "/settings/security", label: "Settings", icon: "settings" },
];
const adminNavigation = [
  { to: "/dashboard", label: "Overview", icon: "overview", end: true },
  { to: "/admin/skills", label: "Skill Library", icon: "skills" },
  { to: "/admin/careers", label: "Career Library", icon: "careers" },
  { to: "/admin/learning", label: "Learning Resources", icon: "learning" },
  { to: "/admin/opportunities", label: "Opportunity Library", icon: "opportunities" },
  { to: "/settings/security", label: "Settings", icon: "settings" },
];

function AppShell({ children, title, eyebrow }) {
  const navigate = useNavigate(); const { logout, user } = useAuth(); const reduced = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false); const [drawerOpen, setDrawerOpen] = useState(false); const [profileOpen, setProfileOpen] = useState(false); const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigation = user.role === "admin" ? adminNavigation : studentNavigation;
  async function handleLogout() { if (isLoggingOut) return; setIsLoggingOut(true); try { await logout(); } catch { /* Auth state still clears. */ } finally { navigate("/login", { replace: true }); } }
  const closeDrawer = () => setDrawerOpen(false);
  const navContent = <><div className="app-brand-row"><NavLink to="/dashboard" onClick={closeDrawer} aria-label="Futurion dashboard"><BrandLogo compact={collapsed} /></NavLink><button type="button" className="app-sidebar-collapse" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}><Icon name="collapse" /></button><button type="button" className="app-drawer-close" onClick={closeDrawer} aria-label="Close navigation"><Icon name="close" /></button></div><div className="app-role-label"><span>{user.role === "admin" ? "Platform administration" : "Student workspace"}</span></div><nav className="app-navigation" aria-label={user.role === "admin" ? "Admin navigation" : "Student navigation"}>{navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={closeDrawer} title={collapsed ? item.label : undefined} className={({ isActive }) => isActive ? "app-nav-item app-nav-item-active" : "app-nav-item"}><Icon name={item.icon} /><span>{item.label}</span><Icon name="chevron" size={15} className="app-nav-chevron" /></NavLink>)}</nav><div className="app-sidebar-account"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><button type="button" onClick={handleLogout} disabled={isLoggingOut} aria-label="Sign out"><Icon name="logout" /></button></div></>;

  return <main className={`app-shell ${collapsed ? "app-shell-collapsed" : ""}`}><aside className="app-sidebar">{navContent}</aside><AnimatePresence>{drawerOpen && <><motion.button type="button" className="app-drawer-backdrop" aria-label="Close navigation" onClick={closeDrawer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="app-mobile-drawer" initial={reduced ? false : { x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ duration: .28 }}>{navContent}</motion.aside></>}</AnimatePresence><section className="app-main"><header className="app-topbar"><button type="button" className="app-menu-trigger" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" aria-expanded={drawerOpen}><Icon name="menu" /></button><div className="app-breadcrumb"><span>{eyebrow}</span><h1>{title}</h1></div><div className="app-profile-menu"><button type="button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-label="Open profile menu"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.role}</small></div><b>⌄</b></button>{profileOpen && <div className="app-profile-dropdown"><NavLink to={user.role === "student" ? "/profile" : "/settings/security"} onClick={() => setProfileOpen(false)}>{user.role === "student" ? "View profile" : "Account settings"}</NavLink><NavLink to="/settings/security" onClick={() => setProfileOpen(false)}>Security & sessions</NavLink><button type="button" onClick={handleLogout}>{isLoggingOut ? "Signing out…" : "Sign out"}</button></div>}</div></header><motion.div className="app-content" initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .38 }}>{children}</motion.div></section></main>;
}

export default AppShell;
