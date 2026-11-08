import { motion, useReducedMotion } from "framer-motion";

function Reveal({ children, className = "", delay = 0, y = 28, as = "div", once = true }) {
  const reduced = useReducedMotion();
  const Component = motion[as] || motion.div;
  return <Component className={className} initial={reduced ? false : { opacity: 0, y }} whileInView={reduced ? undefined : { opacity: 1, y: 0 }} viewport={{ once, amount: 0.16 }} transition={{ duration: .65, delay, ease: [.22, 1, .36, 1] }}>{children}</Component>;
}

function PageTransition({ children, className = "" }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, ease: [.22, 1, .36, 1] }}>{children}</motion.div>;
}

export { PageTransition };
export default Reveal;
