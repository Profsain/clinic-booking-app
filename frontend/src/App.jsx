import { useMemo, useState } from 'react';
import {
  Activity, ArrowRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, HeartPulse, KeyRound, LoaderCircle, Search, ShieldCheck, Stethoscope,
  UserRound, XCircle
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

function formatDate(value) {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(value));
}
function formatTime(value) {
  return new Intl.DateTimeFormat('en-NG', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
function initials(name = '') {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [slots, setSlots] = useState([]);
  const [provider, setProvider] = useState('all');
  const [activeDate, setActiveDate] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [lookupEmail, setLookupEmail] = useState('');
  const [history, setHistory] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingDetailLoadingId, setBookingDetailLoadingId] = useState(null);
  const [historyCursor, setHistoryCursor] = useState(null);
  const [historyNext, setHistoryNext] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  };

  const loadSlots = async () => {
    if (!apiKey.trim()) { setError('Enter your API key to connect to the booking service.'); return; }
    setLoading(true); setError('');
    try {
      const query = provider === 'all' ? '' : `?provider=${encodeURIComponent(provider)}`;
      const data = await request(`/slots${query}`);
      setSlots(data.slots || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };


  const providers = useMemo(() => [...new Set(slots.map(slot => slot.provider))], [slots]);
  const dates = useMemo(() => [...new Set(slots.map(slot => new Date(slot.start).toDateString()))], [slots]);
  const visibleSlots = slots.filter(slot => {
    const providerMatch = provider === 'all' || slot.provider === provider;
    const dateMatch = activeDate === 'all' || new Date(slot.start).toDateString() === activeDate;
    return providerMatch && dateMatch;
  });

  const book = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true); setError('');
    try {
      const data = await request('/bookings', {
        method: 'POST',
        body: JSON.stringify({ slot_id: selected.id, name, email }),
        headers: { 'Idempotency-Key': crypto.randomUUID() }
      });
      setConfirmation(data);
      setSelected(null);
      setName(''); setEmail('');
      await loadSlots();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const loadHistory = async (cursor = null) => {
    if (!lookupEmail.trim()) { setError('Enter an email address to find bookings.'); return; }
    setHistoryLoading(true); setError('');
    try {
      const params = new URLSearchParams({ email: lookupEmail.trim(), limit: '10' });
      if (cursor) params.set('cursor', cursor);
      const data = await request(`/bookings?${params.toString()}`);
      setHistory(cursor ? current => [...current, ...data.bookings] : data.bookings);
      setHistoryNext(data.next_cursor);
      setHistoryCursor(cursor);
    } catch (err) { setError(err.message); }
    finally { setHistoryLoading(false); }
  };

  const cancel = async (id) => {
    try {
      await request(`/bookings/${id}`, { method: 'DELETE' });
      setNotice('Appointment cancelled. The slot is available again.');
      await loadHistory();
      await loadSlots();
    } catch (err) { setError(err.message); }
  };

  const showBookingDetails = async (booking) => {
    setSelectedBooking(booking);
    setBookingDetailLoadingId(booking.id);
    setError('');
    try {
      const details = await request(`/bookings/${booking.id}`);
      setSelectedBooking(current => current?.id === booking.id ? details : current);
    } catch (err) {
      setError(err.message);
    } finally {
      setBookingDetailLoadingId(current => current === booking.id ? null : current);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark"><HeartPulse size={21} /></span>
          <span>care<span className="brand-accent">point</span><small>CLINIC PORTAL</small></span>
        </a>
        <div className="topbar-right">
          <span className="secure-label"><ShieldCheck size={15} /> Secure appointment portal</span>
          <button className="icon-button" title="Refresh slots" onClick={loadSlots}><Activity size={18} /></button>
        </div>
      </header>

      <main id="top">
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
            <div className="floating-chip"><span className="chip-check"><CheckCircle2 size={15} /></span> Appointment ready</div>
          </div>
        </section>

        <section className="connection-panel">
          <div className="connection-icon"><KeyRound size={19} /></div>
          <div className="connection-copy"><strong>Connect to clinic services</strong><span>Your API key is used only for requests in this session.</span></div>
          <input aria-label="API key" type="password" placeholder="Enter X-API-Key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          <button className="connect-button" onClick={loadSlots}>Connect <ArrowRight size={15} /></button>
        </section>

        {(error || notice) && <div className={error ? 'alert error-alert' : 'alert success-alert'}>
          {error ? <XCircle size={17} /> : <CheckCircle2 size={17} />}{error || notice}
          <button onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss"><XCircle size={15} /></button>
        </div>}

        {confirmation && <section className="confirmation-card">
          <div className="confirmation-icon"><CheckCircle2 size={25} /></div>
          <div><span className="eyebrow">BOOKING CONFIRMED</span><h2>Your appointment is reserved.</h2>
            <p>{confirmation.name}, your appointment request has been confirmed. Keep this booking reference for your records.</p>
            <div className="confirmation-meta"><span>REFERENCE <b>{confirmation.id}</b></span><span>EMAIL <b>{confirmation.email}</b></span></div>
          </div>
          <button className="close-confirm" onClick={() => setConfirmation(null)} aria-label="Close confirmation"><XCircle size={19} /></button>
        </section>}

        <section className="booking-section">
          <div className="section-heading">
            <div><div className="eyebrow">BOOK A VISIT</div><h2>Available appointments</h2><p>Browse the schedule and select a time that works for you.</p></div>
            <div className="availability-count"><span className="count-dot" /> {slots.filter(s => s.available).length} available slots</div>
          </div>
          <div className="filters">
            <div className="filter-control"><UserRound size={16} /><select value={provider} onChange={e => setProvider(e.target.value)}><option value="all">All providers</option>{providers.map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="date-tabs"><button className={activeDate === 'all' ? 'date-tab active' : 'date-tab'} onClick={() => setActiveDate('all')}>All dates</button>{dates.slice(0, 4).map(date => <button key={date} className={activeDate === date ? 'date-tab active' : 'date-tab'} onClick={() => setActiveDate(date)}>{new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</button>)}</div>
          </div>
          {loading ? <div className="empty-state"><LoaderCircle className="spin" size={25} /><p>Loading appointment slots…</p></div> :
            visibleSlots.length === 0 ? <div className="empty-state"><CalendarDays size={27} /><h3>No appointment slots to show</h3><p>Connect with your API key or try another provider or date.</p><button className="text-button" onClick={loadSlots}>Refresh schedule <ArrowRight size={14} /></button></div> :
            <div className="slot-grid">{visibleSlots.map(slot => <article className={slot.available ? 'slot-card' : 'slot-card unavailable'} key={slot.id}>
              <div className="slot-top"><span className="slot-date"><CalendarDays size={15} />{formatDate(slot.start)}</span><span className={slot.available ? 'slot-status' : 'slot-status busy'}>{slot.available ? 'Available' : 'Booked'}</span></div>
              <div className="provider-row"><div className="avatar">{initials(slot.provider)}</div><div><strong>{slot.provider}</strong><span>Clinic specialist</span></div></div>
              <div className="slot-time"><Clock3 size={16} /><strong>{formatTime(slot.start)}</strong><span>—</span>{formatTime(slot.end)}</div>
              <button className={slot.available ? 'book-button' : 'book-button disabled'} disabled={!slot.available} onClick={() => setSelected(slot)}>{slot.available ? 'Book this slot' : 'Slot unavailable'} {slot.available && <ArrowRight size={15} />}</button>
            </article>)}</div>}
        </section>

        <section className="history-section">
          <div className="section-heading compact-heading"><div><div className="eyebrow">YOUR APPOINTMENTS</div><h2>Booking history</h2><p>Look up appointments associated with your email address.</p></div></div>
          <form className="history-search" onSubmit={e => { e.preventDefault(); loadHistory(); }}>
            <Search size={17} /><input type="email" placeholder="Enter your booking email" value={lookupEmail} onChange={e => setLookupEmail(e.target.value)} required />
            <button type="submit" disabled={historyLoading}>{historyLoading ? 'Searching…' : 'Find bookings'} <ArrowRight size={15} /></button>
          </form>
          {history.length > 0 && <div className="history-list">{history.map(item => <div className="history-item" key={item.id}>
            <button type="button" className="history-item-select" onClick={() => showBookingDetails(item)} aria-label={`View booking details for ${item.name}`}>
              <span className="history-symbol"><CalendarDays size={18} /></span><span className="history-detail"><strong>{item.name}</strong><span>{item.slot_id} · {item.email}</span></span>
              <span className={item.status === 'confirmed' ? 'history-status' : 'history-status cancelled'}>{item.status}</span>
            </button>
            {item.status === 'confirmed' && <button className="cancel-button" onClick={() => cancel(item.id)}>Cancel</button>}
          </div>)}{historyNext && <button className="load-more" onClick={() => loadHistory(historyNext)} disabled={historyLoading}>Load more appointments <ChevronRight size={15} /></button>}</div>}
          {history.length === 0 && lookupEmail && !historyLoading && <p className="history-hint">Search to view your appointment history.</p>}
        </section>
      </main>

      <footer><div className="brand footer-brand"><span className="brand-mark"><HeartPulse size={18} /></span><span>care<span className="brand-accent">point</span><small>CLINIC PORTAL</small></span></div><span>Thoughtful care starts with a simple appointment.</span><span>© {new Date().getFullYear()} CarePoint Clinic</span></footer>

      {selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
        <form className="booking-modal" onSubmit={book}>
          <button type="button" className="modal-close" onClick={() => setSelected(null)}><XCircle size={20} /></button>
          <div className="modal-icon"><CalendarDays size={22} /></div><div className="eyebrow">CONFIRM YOUR VISIT</div><h2>Book appointment</h2>
          <div className="selected-slot"><strong>{selected.provider}</strong><span>{formatDate(selected.start)} · {formatTime(selected.start)}–{formatTime(selected.end)}</span></div>
          <label>Full name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ada Obi" required minLength={1} /></label>
          <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
          <button className="book-button modal-submit" type="submit" disabled={submitting}>{submitting ? 'Confirming appointment…' : 'Confirm booking'} {submitting ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}</button>
          <p className="modal-footnote"><ShieldCheck size={14} /> Your information is sent securely to the clinic API.</p>
        </form>
      </div>}

      {selectedBooking && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedBooking(null); }}>
        <section className="booking-modal booking-details-modal" role="dialog" aria-modal="true" aria-labelledby="booking-details-title">
          <button type="button" className="modal-close" onClick={() => setSelectedBooking(null)} aria-label="Close booking details"><XCircle size={20} /></button>
          <div className="modal-icon"><CalendarDays size={22} /></div><div className="eyebrow">BOOKING DETAILS</div><h2 id="booking-details-title">Appointment information</h2>
          {bookingDetailLoadingId === selectedBooking.id && <p className="booking-details-loading">Loading appointment schedule…</p>}
          <dl className="booking-details-list">
            <div><dt>Booking reference</dt><dd>{selectedBooking.id}</dd></div>
            <div><dt>Patient</dt><dd>{selectedBooking.name}</dd></div>
            <div><dt>Email</dt><dd>{selectedBooking.email}</dd></div>
            <div><dt>Status</dt><dd><span className={selectedBooking.status === 'confirmed' ? 'history-status' : 'history-status cancelled'}>{selectedBooking.status}</span></dd></div>
            {selectedBooking.slot && <>
              <div><dt>Provider</dt><dd>{selectedBooking.slot.provider}</dd></div>
              <div><dt>Appointment date</dt><dd>{formatDate(selectedBooking.slot.start)}</dd></div>
              <div><dt>Appointment time</dt><dd>{formatTime(selectedBooking.slot.start)}–{formatTime(selectedBooking.slot.end)}</dd></div>
            </>}
            <div><dt>Slot reference</dt><dd>{selectedBooking.slot_id}</dd></div>
            <div><dt>Booked on</dt><dd>{formatDate(selectedBooking.created_at)} at {formatTime(selectedBooking.created_at)}</dd></div>
          </dl>
        </section>
      </div>}
    </div>
  );
}
