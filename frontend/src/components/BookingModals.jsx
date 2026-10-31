import {
  ArrowRight,
  CalendarDays,
  LoaderCircle,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { formatDate, formatTime } from './formatters.js';

export function BookingModal({
  selected,
  name,
  email,
  submitting,
  onNameChange,
  onEmailChange,
  onClose,
  onSubmit
}) {
  return (
    <div className="modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <form className="booking-modal" onSubmit={onSubmit}>
        <button type="button" className="modal-close" onClick={onClose}>
          <XCircle size={20} />
        </button>
        <div className="modal-icon"><CalendarDays size={22} /></div>
        <div className="eyebrow">CONFIRM YOUR VISIT</div>
        <h2>Book appointment</h2>
        <div className="selected-slot">
          <strong>{selected.provider}</strong>
          <span>{formatDate(selected.start)} · {formatTime(selected.start)}–{formatTime(selected.end)}</span>
        </div>
        <label>
          Full name
          <input
            value={name}
            onChange={event => onNameChange(event.target.value)}
            placeholder="e.g. Ada Obi"
            required
            minLength={1}
          />
        </label>
        <label>
          Email address
          <input
            type="email"
            value={email}
            onChange={event => onEmailChange(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <button className="book-button modal-submit" type="submit" disabled={submitting}>
          {submitting ? 'Confirming appointment…' : 'Confirm booking'}
          {submitting ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}
        </button>
        <p className="modal-footnote">
          <ShieldCheck size={14} /> Your information is sent securely to the clinic API.
        </p>
      </form>
    </div>
  );
}

export function BookingDetailsModal({ booking, loading, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="booking-modal booking-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-details-title"
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close booking details"
        >
          <XCircle size={20} />
        </button>
        <div className="modal-icon"><CalendarDays size={22} /></div>
        <div className="eyebrow">BOOKING DETAILS</div>
        <h2 id="booking-details-title">Appointment information</h2>
        {loading && <p className="booking-details-loading">Loading appointment schedule…</p>}
        <dl className="booking-details-list">
          <div><dt>Booking reference</dt><dd>{booking.id}</dd></div>
          <div><dt>Patient</dt><dd>{booking.name}</dd></div>
          <div><dt>Email</dt><dd>{booking.email}</dd></div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={booking.status === 'confirmed' ? 'history-status' : 'history-status cancelled'}>
                {booking.status}
              </span>
            </dd>
          </div>
          {booking.slot && <>
            <div><dt>Provider</dt><dd>{booking.slot.provider}</dd></div>
            <div><dt>Appointment date</dt><dd>{formatDate(booking.slot.start)}</dd></div>
            <div>
              <dt>Appointment time</dt>
              <dd>{formatTime(booking.slot.start)}–{formatTime(booking.slot.end)}</dd>
            </div>
          </>}
          <div><dt>Slot reference</dt><dd>{booking.slot_id}</dd></div>
          <div>
            <dt>Booked on</dt>
            <dd>{formatDate(booking.created_at)} at {formatTime(booking.created_at)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
