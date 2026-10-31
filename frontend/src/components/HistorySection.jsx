import {
  ArrowRight,
  CalendarDays,
  Search,
  ChevronRight
} from 'lucide-react';

export default function HistorySection({
  lookupEmail,
  history,
  historyNext,
  historyLoading,
  onLookupEmailChange,
  onLoadHistory,
  onShowBookingDetails,
  onCancel
}) {
  return (
    <section className="history-section">
      <div className="section-heading compact-heading">
        <div>
          <div className="eyebrow">YOUR APPOINTMENTS</div>
          <h2>Booking history</h2>
          <p>Look up appointments associated with your email address.</p>
        </div>
      </div>
      <form
        className="history-search"
        onSubmit={event => { event.preventDefault(); onLoadHistory(); }}
      >
        <Search size={17} />
        <input
          type="email"
          placeholder="Enter your booking email"
          value={lookupEmail}
          onChange={event => onLookupEmailChange(event.target.value)}
          required
        />
        <button type="submit" disabled={historyLoading}>
          {historyLoading ? 'Searching…' : 'Find bookings'} <ArrowRight size={15} />
        </button>
      </form>
      {history.length > 0 && (
        <div className="history-list">
          {history.map(item => (
            <div className="history-item" key={item.id}>
              <button
                type="button"
                className="history-item-select"
                onClick={() => onShowBookingDetails(item)}
                aria-label={`View booking details for ${item.name}`}
              >
                <span className="history-symbol"><CalendarDays size={18} /></span>
                <span className="history-detail">
                  <strong>{item.name}</strong><span>{item.slot_id} · {item.email}</span>
                </span>
                <span className={item.status === 'confirmed' ? 'history-status' : 'history-status cancelled'}>
                  {item.status}
                </span>
              </button>
              {item.status === 'confirmed' && (
                <button className="cancel-button" onClick={() => onCancel(item.id)}>Cancel</button>
              )}
            </div>
          ))}
          {historyNext && (
            <button
              className="load-more"
              onClick={() => onLoadHistory(historyNext)}
              disabled={historyLoading}
            >
              Load more appointments <ChevronRight size={15} />
            </button>
          )}
        </div>
      )}
      {history.length === 0 && lookupEmail && !historyLoading && (
        <p className="history-hint">Search to view your appointment history.</p>
      )}
    </section>
  );
}
