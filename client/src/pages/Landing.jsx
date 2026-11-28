import { motion } from "framer-motion";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FooterLinks } from "../components/Layout";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { Button, ErrorNote, Field, Tag } from "../components/ui";
import { api, errorText, session } from "../lib/api";

/* Split headline text into words, animate each word sliding up from a clip mask */
const LINE_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const WORD_VARIANTS = {
  hidden:  { y: 22, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

function AnimatedHeadline({ lines }) {
  return (
    <motion.h1
      className="mt-5 mb-6 text-5xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight"
      variants={LINE_VARIANTS}
      initial="hidden"
      animate="visible"
      aria-label={lines.join(" ")}
    >
      {lines.map((line, li) => (
        <span key={li} className="block pb-2 pr-3">
          {line.split(" ").map((word, wi) => (
            <motion.span
              key={wi}
              variants={WORD_VARIANTS}
              className="text-extrusion inline-block mr-[0.24em] last:mr-0"
            >
              {word}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.h1>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  if (session.get()) return <Navigate to="/dashboard" replace />;

  const change = (key) => (event) => {
    setForm({ ...form, [key]: event.target.value });
    if (fieldErrors[key]) setFieldErrors({ ...fieldErrors, [key]: "" });
  };

  function validate() {
    const errs = {};
    if (!form.email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address";
    }
    if (!form.password) {
      errs.password = "Password is required";
    } else if (form.password.length < 4) {
      errs.password = "Password too short";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      session.set(data.token);
      navigate("/dashboard");
    } catch (failure) {
      setError(errorText(failure));
      setBusy(false);
    }
  }

  async function submitForgot(event) {
    event.preventDefault();
    if (!forgotEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setError("Please provide a valid officer email address.");
      return;
    }
    setForgotBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotMessage(data.message || "Password recovery instructions logged.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div className="overflow-hidden">
      <div className="relative mx-auto flex min-h-screen max-w-[1280px] flex-col px-4 md:px-8">
        <header className="flex items-center justify-between py-5 border-b-[3px] border-red-500">
          <Logo size="large" showTagline={true} />
          <ThemeToggle />
        </header>
        <main className="relative grid flex-1 items-center gap-10 py-8 lg:grid-cols-12">
          <div aria-hidden="true" className="stripe top-[40%] -left-[20vw] w-[150vw] -rotate-[9deg] opacity-80" />

          {/* Left Column: Officer Sign In Card */}
          <div className="relative z-10 lg:col-span-5">
            <div className="hard-shadow border-2 border-line bg-surface p-6 sm:p-8">
              {!forgotMode ? (
                <>
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 inline-block border-2 border-neon bg-bg px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-neon uppercase">
                      Officers only
                    </div>
                    <h2 className="font-display m-0 text-2xl sm:text-3xl font-bold text-ink">
                      Officer Sign In
                    </h2>
                    <p className="mt-2 mb-0 text-xs text-muted">
                      Sign in to review post-course outcomes, skill gaps, and impact.
                    </p>
                  </div>

                  <form onSubmit={submit} className="space-y-4" noValidate>
                    <Field label="Email" error={fieldErrors.email}>
                      <input
                        className={`field ${fieldErrors.email ? "border-pink" : ""}`}
                        type="email"
                        autoComplete="username"
                        placeholder="officer@skilltrack.in"
                        required
                        value={form.email}
                        onChange={change("email")}
                      />
                    </Field>

                    <Field label="Password" error={fieldErrors.password}>
                      <div className="relative">
                        <input
                          className={`field pr-16 ${fieldErrors.password ? "border-pink" : ""}`}
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          required
                          value={form.password}
                          onChange={change("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer border border-line bg-bg px-2 py-0.5 font-mono text-[11px] text-muted hover:text-ink"
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </Field>

                    <div className="flex items-center justify-between text-[12px]">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotMode(true);
                          setError("");
                          setForgotEmail(form.email);
                        }}
                        className="cursor-pointer border-0 bg-transparent p-0 text-muted underline hover:text-cyan"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <ErrorNote>{error}</ErrorNote>

                    <Button variant="primary" type="submit" loading={busy} disabled={busy} className="w-full">
                      {busy ? "Authenticating..." : "Sign in to Skill Track"}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 inline-block border-2 border-cyan bg-bg px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-cyan uppercase">
                      Recovery
                    </div>
                    <h2 className="font-display m-0 text-2xl font-bold text-ink">
                      Forgot Password
                    </h2>
                    <p className="mt-2 mb-0 text-xs text-muted">
                      Enter your officer email to receive password recovery assistance.
                    </p>
                  </div>

                  {forgotMessage ? (
                    <div className="space-y-4">
                      <div className="border-2 border-neon bg-bg p-4 text-xs text-neon leading-relaxed">
                        {forgotMessage}
                      </div>
                      <Button
                        variant="plain"
                        onClick={() => {
                          setForgotMode(false);
                          setForgotMessage("");
                        }}
                        className="w-full"
                      >
                        Return to Sign In
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={submitForgot} className="space-y-4" noValidate>
                      <Field label="Officer Email">
                        <input
                          className="field"
                          type="email"
                          autoComplete="email"
                          placeholder="officer@skilltrack.in"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                        />
                      </Field>

                      <ErrorNote>{error}</ErrorNote>

                      <Button variant="primary" type="submit" loading={forgotBusy} disabled={forgotBusy} className="w-full">
                        {forgotBusy ? "Checking..." : "Request Reset"}
                      </Button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setForgotMode(false);
                            setError("");
                          }}
                          className="cursor-pointer border-0 bg-transparent p-0 text-xs text-muted underline hover:text-cyan"
                        >
                          Cancel and return to sign in
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              <div className="mt-6 border-t border-line pt-4 text-center text-[12px] text-muted">
                Trainee? You do not log in. Open the link sent to your phone.
              </div>
            </div>
          </div>

          {/* Right Column: Hero Copy & Tags */}
          <div className="relative z-10 lg:col-span-7">
            <Tag tone="yellow" tilt={-3} delay={0.05}>
              Who actually got hired?
            </Tag>
            <AnimatedHeadline lines={["Training done.", "Then what?"]} />
            <p className="max-w-lg text-base text-muted leading-relaxed">
              Skill Track records verified employment status after government and partner courses:
              who found work, what skills employers are demanding, and whether training outperformed the comparison group.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Tag tone="pink" tilt={2} delay={0.12}>
                Did anyone call them back?
              </Tag>
              <Tag tone="yellow" tilt={-1} delay={0.18}>
                Which skill is missing?
              </Tag>
              <Tag tone="pink" tilt={1} delay={0.24}>
                Would they be working anyway?
              </Tag>
            </div>
          </div>
        </main>
        <FooterLinks />
      </div>
    </div>
  );
}
