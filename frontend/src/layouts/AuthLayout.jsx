import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import landingHero from "../assets/futurion-landing-hero.png";
import pencilIllustration from "../assets/futurion-pencil-illustration.png";
import BrandLogo from "../components/brand/BrandLogo.jsx";
import { PageTransition } from "../components/motion/Reveal.jsx";

function PathMarker({ number, label, active = false }) {
  return <div className={`auth-path-marker ${active ? "auth-path-marker-active" : ""}`}><span>{number}</span><div><b>{label}</b><i /></div></div>;
}

function AuthLayout({ children, activeStep = 1, variant = "register" }) {
  const reduced = useReducedMotion();
  const direction = variant === "login" ? 1 : -1;
  const visual = variant === "login"
    ? { alt: "Student exploring digital learning and career skills", className: "auth-login-visual", src: landingHero }
    : { alt: "Student holding a large yellow pencil", className: "auth-register-visual", src: pencilIllustration };
  return <main className={`auth-shell auth-shell-${variant}`}><motion.aside className="auth-brand-panel" initial={reduced ? false : { opacity: 0, x: 56 * direction }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, ease: "easeOut" }}><Link to="/" className="auth-brand-link" aria-label="Futurion home"><BrandLogo /></Link><div className="auth-brand-copy"><p>YOUR NEXT CHAPTER</p><h1>Build a career path that feels like <em>yours.</em></h1><span>Bring your education, interests and ambitions together in one clear, evidence-led plan.</span><div className="auth-path"><PathMarker number="01" label="Create your account" active={activeStep === 1} /><PathMarker number="02" label="Confirm your email" active={activeStep === 2} /><PathMarker number="03" label="Shape your direction" active={activeStep === 3} /></div></div><motion.div className={`auth-pencil ${visual.className}`} initial={reduced ? false : { opacity: 0, y: 25, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -2 }} transition={{ duration: .8, delay: .15 }}><img src={visual.src} alt={visual.alt} loading="lazy" /></motion.div><p className="auth-discipline-note">Designed for students across every discipline.</p></motion.aside><motion.section className="auth-form-panel" initial={reduced ? false : { opacity: 0, x: -56 * direction }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, ease: "easeOut" }}><header className="auth-mobile-header"><Link to="/" aria-label="Futurion home"><BrandLogo compact /></Link><span>Step {activeStep} of 3</span></header><PageTransition className="auth-form-wrap"><div className="auth-form-card">{children}</div><Link to="/" className="auth-back-home">← Back to Futurion home</Link></PageTransition></motion.section></main>;
}

export default AuthLayout;
