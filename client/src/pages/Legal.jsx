import { Link } from "react-router-dom";
import { FooterLinks } from "../components/Layout";
import { Logo } from "../components/Logo";
import { Window } from "../components/ui";

function Document({ title, sections }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/" className="no-underline">
        <Logo />
      </Link>
      <h1 className="headline my-6 text-4xl">{title}</h1>
      <Window title={`${title.toUpperCase().replace(/ /g, "_")}.TXT`}>
        {sections.map(([heading, text]) => (
          <section key={heading} className="mb-5">
            <h2 className="mb-1 text-base font-bold">{heading}</h2>
            <p className="text-muted">{text}</p>
          </section>
        ))}
        <p className="text-[12px] text-muted">Last updated 26 November 2026.</p>
      </Window>
      <FooterLinks />
    </main>
  );
}

export const Privacy = () => (
  <Document
    title="Privacy"
    sections={[
      ["What is kept", "For trainees: name, mobile number, program, district, batch, enrolment date, skills, earlier salary if the centre supplied it, and what you answer in a check-in (job status, employer, role, salary range, start month). For officers: email address and a scrambled (hashed) password."],
      ["Why", "To record what happened after training, find skills employers ask for that trainees lack, and judge whether programs helped."],
      ["Who sees it", "Signed-in officers of the department that runs this desk. Trainees see only their own first name and program when they open their link. Reports exported from the dashboard carry totals, not names."],
      ["Outside services", "Uploaded curriculum and job posting PDFs are sent as text to Groq to pick out skill names. Skill gap totals are sent to Groq to draft training suggestions. Trainee records are not sent. Do not upload PDFs that contain personal details. Hosting and database providers store the data on the department's behalf."],
      ["Your browser", "Officers' login tokens are kept in local storage and expire after 12 hours. There are no advertising or tracking cookies. Fonts load from Google Fonts, which receives your IP address."],
      ["Your choices", "Answering a check-in is optional. To see, correct or delete your record, ask the training centre or department office that sent you the link."],
    ]}
  />
);

export const Terms = () => (
  <Document
    title="Terms of use"
    sections={[
      ["Who may use it", "Officers with an account issued by the department, and trainees opening a check-in link sent to them."],
      ["Officer duties", "Keep your password to yourself. Upload only data you are allowed to hold. Send each check-in link only to the person it belongs to."],
      ["Trainee answers", "Answer for yourself and as accurately as you can. The department may check an employment answer with the employer."],
      ["About the figures", "Placement figures cover only trainees who answered. The comparison group shipped with this software is sample data. Do not present impact figures built on it as evidence that a program caused a result."],
      ["Machine-written text", "Skill extraction and training suggestions come from a language model and can be wrong. Check them before acting."],
      ["Availability", "The service is provided as it is, and may be paused for maintenance. The department running it is responsible for backups and for meeting data protection law."],
    ]}
  />
);

export const NotFound = () => (
  <main className="mx-auto max-w-md px-4 py-16">
    <Window title="404.ERR">
      <p className="mt-0">Bad command or file name. There is no page here.</p>
      <Link to="/" className="text-neon">
        Back to the start
      </Link>
    </Window>
  </main>
);
