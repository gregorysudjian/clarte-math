import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "../../components/icons";
import { login } from "../actions";
import { isSignedIn } from "../session";
import PasswordField from "./password-field";
import "../hq.css";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isSignedIn()) redirect("/hq");
  const { error } = await searchParams;
  return (
    <main className="hq-login">
      <section className="hq-login-brand">
        <Link className="hq-brand" href="/"><span>N</span><b>Northstar <em>HQ</em></b></Link>
        <div>
          <h1>Your tutoring, <span>organized.</span></h1>
          <p>Requests, clients, lessons, payments and notes, all in one place.</p>
        </div>
        <ul>
          <li><Icon name="inbox" />New requests from the website</li>
          <li><Icon name="calendar" />Lesson calendar</li>
          <li><Icon name="wallet" />Payments and balances</li>
        </ul>
      </section>
      <section className="hq-login-panel">
        <form className="hq-login-card" action={login}>
          <span className="hq-login-lock"><Icon name="lock" /></span>
          <h2>Welcome back</h2>
          <p>Enter your password to open the dashboard.</p>
          {error && <p className="hq-alert" role="alert">{error}</p>}
          <PasswordField />
          <button className="hq-primary hq-login-submit">Sign in<Icon name="arrow" /></button>
          <Link className="hq-login-back" href="/">← Back to website</Link>
        </form>
      </section>
    </main>
  );
}
