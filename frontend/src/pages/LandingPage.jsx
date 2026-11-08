import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import pencilIllustration from "../assets/futurion-pencil-illustration.png";
import BrandLogo from "../components/brand/BrandLogo.jsx";
import Reveal from "../components/motion/Reveal.jsx";
import Icon from "../components/ui/Icon.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const capabilities = [
  { number: "01", title: "Student Profile", text: "Bring education, projects, experience, certifications and goals into one structured foundation.", note: "Your evidence base" },
  { number: "02", title: "Skill Intelligence", text: "Map proficiency, supporting evidence, dependencies and practical development priorities.", note: "Understand your strengths" },
  { number: "03", title: "Career Discovery", text: "Explore cross-disciplinary career paths and compare them with the profile information you have recorded.", note: "See more possibilities" },
  { number: "04", title: "Career Comparison", text: "Place multiple directions side by side and test hypothetical scenarios without changing your actual profile.", note: "Decide with context" },
  { number: "05", title: "Learning Resources", text: "Find structured resources connected to real skill gaps, prerequisites and career goals.", note: "Learn with purpose" },
  { number: "06", title: "Career Roadmaps", text: "Turn career requirements into ordered, trackable preparation tasks built around your available learning time.", note: "Prepare step by step" },
  { number: "07", title: "Opportunity Intelligence", text: "Discover relevant openings, understand explainable eligibility and maintain your own application tracker.", note: "Apply with clarity" },
  { number: "08", title: "Career Portfolio", text: "See documented progress across Futurion and publish only the professional sections you choose.", note: "Show your development" },
];

const stages = [
  ["01", "Discover Yourself", "Build an accurate picture of your education, experience, skills and interests."],
  ["02", "Explore Possibilities", "Investigate careers across disciplines and compare different directions."],
  ["03", "Prepare with Direction", "Connect skill gaps to learning resources, roadmaps and evidence-building work."],
  ["04", "Track Your Progress", "Follow completed work, opportunities and a student-controlled professional portfolio."],
];

const reasons = [
  ["Cross-disciplinary career mapping", "Explore technical and non-technical pathways without treating one academic background as the only route."],
  ["Personalized skill intelligence", "Use your recorded proficiency, evidence and learning status as the basis for practical guidance."],
  ["Evidence-based development", "Separate self-declared skills from demonstrated or verified supporting evidence."],
  ["Career scenario comparison", "Compare actual and hypothetical directions while keeping them clearly separated."],
  ["Structured learning roadmaps", "Break preparation into staged tasks, dependencies and manageable learning activity."],
  ["Explainable opportunity eligibility", "See why each explicit requirement is met, partial, unmet or unknown."],
  ["Unified career progress", "Bring milestones, learning, roadmaps and portfolio-ready records into one connected view."],
];

function LandingPage() {
  const { user } = useAuth(); const [menuOpen, setMenuOpen] = useState(false); const reduced = useReducedMotion();
  const x = useMotionValue(0); const y = useMotionValue(0);
  const rotateY = useSpring(useTransform(x, [-.5, .5], [-8, 8]), { stiffness: 140, damping: 18 });
  const rotateX = useSpring(useTransform(y, [-.5, .5], [7, -7]), { stiffness: 140, damping: 18 });
  const { scrollYProgress } = useScroll(); const heroY = useTransform(scrollYProgress, [0, .22], [0, reduced ? 0 : 70]);
  function tilt(event) { if (reduced) return; const box = event.currentTarget.getBoundingClientRect(); x.set((event.clientX - box.left) / box.width - .5); y.set((event.clientY - box.top) / box.height - .5); }
  function resetTilt() { x.set(0); y.set(0); }
  const close = () => setMenuOpen(false);

  return <main className="landing-page">
    <header className="landing-nav"><Link to="/" aria-label="Futurion home"><BrandLogo /></Link><button type="button" className="landing-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="landing-navigation" aria-label={menuOpen ? "Close navigation" : "Open navigation"}><Icon name={menuOpen ? "close" : "menu"} /></button><nav id="landing-navigation" className={menuOpen ? "landing-links landing-links-open" : "landing-links"}><a href="#home" onClick={close}>Home</a><a href="#capabilities" onClick={close}>Explore Careers</a><a href="#features" onClick={close}>Features</a><a href="#about" onClick={close}>About</a><Link to={user ? "/dashboard" : "/login"} onClick={close}>{user ? "Dashboard" : "Login"}</Link><Link className="landing-nav-cta" to={user ? "/dashboard" : "/register"} onClick={close}>{user ? "Open workspace" : "Get Started"}<span>↗</span></Link></nav></header>

    <section id="home" className="landing-hero"><div className="landing-hero-grid"><motion.div className="landing-hero-copy" initial={reduced ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}><div className="landing-kicker"><span>Career & education intelligence</span><i /></div><h1>Your Future Deserves a <em>Clear Direction.</em></h1><p>Discover career possibilities, understand your strengths, build the right skills and move towards your professional goals with a personalized development platform.</p><div className="landing-hero-actions"><a className="landing-button landing-button-primary" href="#about">Explore Futurion <span>↗</span></a><a className="landing-button landing-button-secondary" href="#capabilities">Explore Career Paths <span>→</span></a></div><div className="landing-proof"><span><b>08</b> connected development modules</span><span><b>01</b> student-controlled career workspace</span></div></motion.div>
      <motion.div className="landing-hero-art" style={{ y: heroY }} onMouseMove={tilt} onMouseLeave={resetTilt}><div className="hero-depth-plane hero-depth-plane-one"/><div className="hero-depth-plane hero-depth-plane-two"/><motion.div className="hero-pencil-frame hero-landing-frame" style={{ rotateX, rotateY, transformPerspective: 1000 }} whileHover={reduced ? undefined : { scale: 1.025 }}><span className="hero-pencil-label">PLAN · LEARN · GROW</span><img src={pencilIllustration} alt="Student holding a large yellow pencil" fetchPriority="high" /></motion.div><span className="hero-orbit hero-orbit-one"/><span className="hero-orbit hero-orbit-two"/><div className="hero-note hero-note-top"><b>01</b><span>Understand where you are</span></div><div className="hero-note hero-note-bottom"><b>→</b><span>Build what comes next</span></div></motion.div></div><div className="landing-scroll-cue"><span>Scroll to explore</span><i /></div></section>

    <section id="about" className="landing-intro landing-section"><Reveal className="landing-section-index">01 / CONNECTED JOURNEY</Reveal><div className="landing-intro-grid"><Reveal><p className="landing-overline">One connected development system</p><h2>Your career journey, <em>connected.</em></h2></Reveal><Reveal delay={.1}><p className="landing-intro-lead">Career development rarely happens in a straight line. Futurion keeps the important pieces connected—from understanding yourself to building evidence, preparing for careers and finding relevant opportunities.</p><div className="landing-intro-path"><span>PROFILE</span><i>→</i><span>SKILLS</span><i>→</i><span>CAREERS</span><i>→</i><span>PROGRESS</span></div></Reveal></div></section>

    <section id="capabilities" className="landing-capabilities landing-section"><Reveal className="landing-section-heading"><div><p className="landing-overline">The Futurion platform</p><h2>Eight capabilities. <em>One clear direction.</em></h2></div><p>Each workspace uses the same student records, so your development does not disappear into disconnected tools.</p></Reveal><div className="capability-editorial-grid">{capabilities.map((item, index) => <Reveal key={item.number} delay={(index % 4) * .04} className={`capability-story capability-story-${(index % 4) + 1}`}><div><span>{item.number}</span><small>{item.note}</small></div><h3>{item.title}</h3><p>{item.text}</p><i aria-hidden="true">↗</i></Reveal>)}</div></section>

    <section id="features" className="landing-process landing-section"><Reveal className="landing-section-index">02 / HOW IT WORKS</Reveal><Reveal className="landing-process-heading"><p className="landing-overline">A practical development cycle</p><h2>Move forward in <em>four considered stages.</em></h2></Reveal><div className="landing-stage-list">{stages.map(([number, title, text], index) => <Reveal key={number} as="article" delay={index * .07}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><i>{index === stages.length - 1 ? "●" : "↓"}</i></Reveal>)}</div></section>

    <section className="landing-why landing-section"><div className="landing-why-copy"><Reveal><p className="landing-overline">Why Futurion</p><h2>Built for considered choices, <em>not quick predictions.</em></h2><p>Futurion organizes recorded evidence, structured catalogues and explainable comparisons. It supports preparation without promising a particular career, admission or job outcome.</p><Link className="landing-button landing-button-gold" to={user ? "/dashboard" : "/register"}>Build your direction <span>↗</span></Link></Reveal></div><div className="landing-reason-list">{reasons.map(([title, text], index) => <Reveal key={title} as="article" delay={(index % 3) * .04}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{text}</p></div></Reveal>)}</div></section>

    <section className="landing-final-cta"><Reveal><span>YOUR NEXT CHAPTER</span><h2>Take the next step towards your future.</h2><p>Start with your real education, interests and experience. Build direction from there.</p><Link className="landing-button landing-button-gold" to={user ? "/dashboard" : "/register"}>{user ? "Open your workspace" : "Get Started"}<span>↗</span></Link></Reveal><div className="landing-cta-orbit" aria-hidden="true"><i/><i/><i/></div></section>

    <footer className="landing-footer"><div className="landing-footer-brand"><BrandLogo /><p>A connected career and education intelligence platform for students across disciplines.</p></div><div><h3>Navigate</h3><a href="#home">Home</a><a href="#capabilities">Explore Careers</a><a href="#features">How it works</a><a href="#about">About</a></div><div><h3>Platform</h3><a href="#capabilities">Skill intelligence</a><a href="#capabilities">Career roadmaps</a><a href="#capabilities">Opportunities</a><a href="#capabilities">Portfolio</a></div><div><h3>Account</h3><Link to="/login">Login</Link><Link to="/register">Registration</Link><a href="#privacy">Privacy</a><a href="#terms">Terms</a></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} Futurion</span><span id="privacy">Student-controlled information and privacy settings.</span><span id="terms">Use Futurion with accurate, responsible information.</span></div></footer>
  </main>;
}

export default LandingPage;
