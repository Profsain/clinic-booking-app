import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Stethoscope,
  XCircle
} from 'lucide-react';

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="pulse-dot" /> PATIENT APPOINTMENTS</div>
        <h1>Your health deserves<br /><em>time and attention.</em></h1>
        <p>Find a convenient time with our care team. Choose an available appointment and receive your confirmation instantly.</p>
        <div className="hero-points">
          <span><CheckCircle2 size={16} /> Easy online booking</span>
          <span><CheckCircle2 size={16} /> Flexible appointment times</span>
        </div>
      </div>
      <div className="hero-art">
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        <div className="art-card">
          <div className="art-icon"><Stethoscope size={34} /></div>
          <div className="art-card-title">Care that fits your schedule</div>
          <div className="art-card-sub">Your next step to feeling better.</div>
          <div className="art-lines"><i /><i /><i /></div>
        </div>
        <div className="floating-chip">
          <span className="chip-check"><CheckCircle2 size={15} /></span> Appointment ready
        </div>
      </div>
    </section>
  );
}

export function ConnectionPanel({ apiKey, onApiKeyChange, onConnect }) {
  return (
    <section className="connection-panel">
      <div className="connection-icon"><KeyRound size={19} /></div>
      <div className="connection-copy">
        <strong>Connect to clinic services</strong>
        <span>Your API key is used only for requests in this session.</span>
      </div>
      <input
        aria-label="API key"
        type="password"
        placeholder="Enter X-API-Key"
        value={apiKey}
        onChange={event => onApiKeyChange(event.target.value)}
      />
      <button className="connect-button" onClick={onConnect}>
        Connect <ArrowRight size={15} />
      </button>
    </section>
  );
}

export function Alert({ error, notice, onDismiss }) {
  return (
    <div className={error ? 'alert error-alert' : 'alert success-alert'}>
      {error ? <XCircle size={17} /> : <CheckCircle2 size={17} />}{error || notice}
      <button onClick={onDismiss} aria-label="Dismiss"><XCircle size={15} /></button>
    </div>
  );
}

export function ConfirmationCard({ confirmation, onClose }) {
  return (
    <section className="confirmation-card">
      <div className="confirmation-icon"><CheckCircle2 size={25} /></div>
      <div>
        <span className="eyebrow">BOOKING CONFIRMED</span>
        <h2>Your appointment is reserved.</h2>
        <p>{confirmation.name}, your appointment request has been confirmed. Keep this booking reference for your records.</p>
        <div className="confirmation-meta">
          <span>REFERENCE <b>{confirmation.id}</b></span>
          <span>EMAIL <b>{confirmation.email}</b></span>
        </div>
      </div>
      <button className="close-confirm" onClick={onClose} aria-label="Close confirmation">
        <XCircle size={19} />
      </button>
    </section>
  );
}
