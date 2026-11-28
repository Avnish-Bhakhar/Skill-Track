import { useReducedMotion } from "framer-motion";

export const useMotionOk = () => !useReducedMotion();

export const rowMotion = (index, ok) => ({
  initial: ok ? { opacity: 0, x: -8 } : false,
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.2, delay: ok ? Math.min(index, 20) * 0.03 : 0 },
});
