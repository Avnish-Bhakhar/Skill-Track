import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Outlet, Route, Routes, useLocation, useOutlet } from "react-router-dom";
import Layout from "./components/Layout";
import { session } from "./lib/api";
import { useMotionOk } from "./lib/motion";
import CheckIn from "./pages/CheckIn";
import Dashboard from "./pages/Dashboard";
import Impact from "./pages/Impact";
import Landing from "./pages/Landing";
import Learners from "./pages/Learners";
import { NotFound, Privacy, Terms } from "./pages/Legal";
import SkillGaps from "./pages/SkillGaps";
import Upload from "./pages/Upload";

const RequireAdmin = () => (session.get() ? <Outlet /> : <Navigate to="/" replace />);

function PublicPages() {
  const location = useLocation();
  const outlet = useOutlet();
  const ok = useMotionOk();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={ok ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={ok ? { opacity: 0, y: -12 } : undefined}
        transition={{ duration: ok ? 0.18 : 0 }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <Routes>
        <Route element={<PublicPages />}>
          <Route path="/" element={<Landing />} />
          <Route path="/check-in/:token" element={<CheckIn />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/learners" element={<Learners />} />
            <Route path="/skill-gaps" element={<SkillGaps />} />
            <Route path="/impact" element={<Impact />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
