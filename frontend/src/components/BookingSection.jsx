import {
  ArrowRight,
  CalendarDays,
  Clock3,
  LoaderCircle,
  UserRound
} from 'lucide-react';
import { formatDate, formatTime, initials } from './formatters.js';

export default function BookingSection({
  slots,
  providers,
  dates,
  visibleSlots,
  provider,
  activeDate,
  loading,
  onProviderChange,
  onDateChange,
  onSelectSlot,
  onRefresh
}) {
  return (
    <section className="booking-section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">BOOK A VISIT</div>
          <h2>Available appointments</h2>
          <p>Browse the schedule and select a time that works for you.</p>
        </div>
        <div className="availability-count">
          <span className="count-dot" /> {slots.filter(slot => slot.available).length} available slots
        </div>
      </div>
      <div className="filters">
        <div className="filter-control">
          <UserRound size={16} />
          <select value={provider} onChange={event => onProviderChange(event.target.value)}>
            <option value="all">All providers</option>
            {providers.map(item => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="date-tabs">
          <button
            className={activeDate === 'all' ? 'date-tab active' : 'date-tab'}
            onClick={() => onDateChange('all')}
          >
            All dates
          </button>
          {dates.slice(0, 4).map(date => (
            <button
              key={date}
              className={activeDate === date ? 'date-tab active' : 'date-tab'}
              onClick={() => onDateChange(date)}
            >
              {new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="empty-state">
          <LoaderCircle className="spin" size={25} />
          <p>Loading appointment slots…</p>
        </div>
      ) : visibleSlots.length === 0 ? (
        <div className="empty-state">
          <CalendarDays size={27} />
          <h3>No appointment slots to show</h3>
          <p>Connect with your API key or try another provider or date.</p>
          <button className="text-button" onClick={onRefresh}>
            Refresh schedule <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="slot-grid">
          {visibleSlots.map(slot => (
            <article className={slot.available ? 'slot-card' : 'slot-card unavailable'} key={slot.id}>
              <div className="slot-top">
                <span className="slot-date"><CalendarDays size={15} />{formatDate(slot.start)}</span>
                <span className={slot.available ? 'slot-status' : 'slot-status busy'}>
                  {slot.available ? 'Available' : 'Booked'}
                </span>
              </div>
              <div className="provider-row">
                <div className="avatar">{initials(slot.provider)}</div>
                <div><strong>{slot.provider}</strong><span>Clinic specialist</span></div>
              </div>
              <div className="slot-time">
                <Clock3 size={16} /><strong>{formatTime(slot.start)}</strong>
                <span>—</span>{formatTime(slot.end)}
              </div>
              <button
                className={slot.available ? 'book-button' : 'book-button disabled'}
                disabled={!slot.available}
                onClick={() => onSelectSlot(slot)}
              >
                {slot.available ? 'Book this slot' : 'Slot unavailable'}
                {slot.available && <ArrowRight size={15} />}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
