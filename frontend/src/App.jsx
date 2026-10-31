import { useMemo, useState } from 'react';
import {
  BookingDetailsModal,
  BookingModal
} from './components/BookingModals.jsx';
import BookingSection from './components/BookingSection.jsx';
import HistorySection from './components/HistorySection.jsx';
import {
  Alert,
  ConfirmationCard,
  ConnectionPanel,
  Hero
} from './components/PatientSections.jsx';
import { Footer, Header } from './components/SiteChrome.jsx';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

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
    if (!apiKey.trim()) {
      setError('Enter your API key to connect to the booking service.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const query = provider === 'all' ? '' : `?provider=${encodeURIComponent(provider)}`;
      const data = await request(`/slots${query}`);
      setSlots(data.slots || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

    setSubmitting(true);
    setError('');
    try {
      const data = await request('/bookings', {
        method: 'POST',
        body: JSON.stringify({ slot_id: selected.id, name, email }),
        headers: { 'Idempotency-Key': crypto.randomUUID() }
      });
      setConfirmation(data);
      setSelected(null);
      setName('');
      setEmail('');
      await loadSlots();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const loadHistory = async (cursor = null) => {
    if (!lookupEmail.trim()) {
      setError('Enter an email address to find bookings.');
      return;
    }

    setHistoryLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ email: lookupEmail.trim(), limit: '10' });
      if (cursor) params.set('cursor', cursor);
      const data = await request(`/bookings?${params.toString()}`);
      setHistory(cursor ? current => [...current, ...data.bookings] : data.bookings);
      setHistoryNext(data.next_cursor);
      setHistoryCursor(cursor);
    } catch (err) {
      setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const cancel = async (id) => {
    try {
      await request(`/bookings/${id}`, { method: 'DELETE' });
      setNotice('Appointment cancelled. The slot is available again.');
      await loadHistory();
      await loadSlots();
    } catch (err) {
      setError(err.message);
    }
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
      <Header onRefresh={loadSlots} />
      <main id="top">
        <Hero />
        <ConnectionPanel apiKey={apiKey} onApiKeyChange={setApiKey} onConnect={loadSlots} />
        {(error || notice) && (
          <Alert
            error={error}
            notice={notice}
            onDismiss={() => { setError(''); setNotice(''); }}
          />
        )}
        {confirmation && (
          <ConfirmationCard
            confirmation={confirmation}
            onClose={() => setConfirmation(null)}
          />
        )}
        <BookingSection
          slots={slots}
          providers={providers}
          dates={dates}
          visibleSlots={visibleSlots}
          provider={provider}
          activeDate={activeDate}
          loading={loading}
          onProviderChange={setProvider}
          onDateChange={setActiveDate}
          onSelectSlot={setSelected}
          onRefresh={loadSlots}
        />
        <HistorySection
          lookupEmail={lookupEmail}
          history={history}
          historyNext={historyNext}
          historyLoading={historyLoading}
          onLookupEmailChange={setLookupEmail}
          onLoadHistory={loadHistory}
          onShowBookingDetails={showBookingDetails}
          onCancel={cancel}
        />
      </main>
      <Footer />
      {selected && (
        <BookingModal
          selected={selected}
          name={name}
          email={email}
          submitting={submitting}
          onNameChange={setName}
          onEmailChange={setEmail}
          onClose={() => setSelected(null)}
          onSubmit={book}
        />
      )}
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          loading={bookingDetailLoadingId === selectedBooking.id}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}
