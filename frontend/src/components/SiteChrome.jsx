import {
  Activity,
  HeartPulse,
  ShieldCheck
} from 'lucide-react';

function Brand({ iconSize }) {
  return (
    <div className="brand footer-brand">
      <span className="brand-mark"><HeartPulse size={iconSize} /></span>
      <span>care<span className="brand-accent">point</span><small>CLINIC PORTAL</small></span>
    </div>
  );
}

export function Header({ onRefresh }) {
  return (
    <header className="topbar">
      <a className="brand" href="#top">
        <span className="brand-mark"><HeartPulse size={21} /></span>
        <span>care<span className="brand-accent">point</span><small>CLINIC PORTAL</small></span>
      </a>
      <div className="topbar-right">
        <span className="secure-label"><ShieldCheck size={15} /> Secure appointment portal</span>
        <button className="icon-button" title="Refresh slots" onClick={onRefresh}>
          <Activity size={18} />
        </button>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer>
      <Brand iconSize={18} />
      <span>Thoughtful care starts with a simple appointment.</span>
      <span>© {new Date().getFullYear()} CarePoint Clinic</span>
    </footer>
  );
}
