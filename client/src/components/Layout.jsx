import { AnimatePresence, motion } from "framer-motion";
import { Link, NavLink, useLocation, useNavigate, useOutlet } from "react-router-dom";
import { session } from "../lib/api";
import { useMotionOk } from "../lib/motion";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui";

const LINKS = [
  ["/dashboard", "Dashboard"],
  ["/upload", "Upload"],
  ["/learners", "Learners"],
  ["/skill-gaps", "Skill gaps"],
  ["/impact", "Impact"],
];

export const FooterLinks = () => (
  <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-line py-6 text-[12px] text-muted">
    <div className="flex items-center gap-4">
      <span className="font-display font-semibold text-ink tracking-tight">Skill Track</span>
      <span className="text-muted-dim">Post-training tracking and intelligence platform</span>
    </div>
    <div className="flex gap-4">
      <Link to="/privacy" className="text-muted hover:text-ink underline underline-offset-2 transition-colors">
        Privacy
      </Link>
      <Link to="/terms" className="text-muted hover:text-ink underline underline-offset-2 transition-colors">
        Terms
      </Link>
    </div>
  </footer>
);

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const ok = useMotionOk();

  function logOut() {
    session.clear();
    navigate("/");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col px-4 md:px-8">
      <nav className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b-[3px] border-red-500 py-3.5">
        {/* Logo */}
        <Link
          to="/dashboard"
          className="mr-6 no-underline transition-opacity hover:opacity-85"
        >
          <Logo />
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {LINKS.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative px-3 py-1.5 text-xs sm:text-sm font-medium no-underline transition-colors rounded-sm ${
                  isActive ? "text-primary" : "text-muted hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative z-10">{label}</span>
                  {isActive && ok && (
                    <motion.span
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-sm bg-primary/10 border-b-2 border-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 36 }}
                    />
                  )}
                  {isActive && !ok && (
                    <span className="absolute inset-0 rounded-sm bg-primary/10 border-b-2 border-primary" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2.5">
          <ThemeToggle />
          <Button small onClick={logOut}>
            Sign out
          </Button>
        </div>
      </nav>

      <main className="flex-1 py-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={ok ? { opacity: 0, y: 10 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={ok ? { opacity: 0, y: -6 } : undefined}
            transition={{ duration: ok ? 0.2 : 0, ease: [0.4, 0, 0.2, 1] }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      <FooterLinks />
    </div>
  );
}
