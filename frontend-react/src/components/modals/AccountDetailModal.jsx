export default function AccountDetailModal({ company, tickets, onClose, onShowTicket }) {
  const filtered = tickets.filter(t => (t.company_name || '').toLowerCase() === company.toLowerCase())

  return (
    <div id="account-detail-modal" className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content modal-wide">
        <div className="modal-header">
          <div>
            <h2 id="account-modal-title">{company} Intelligence</h2>
            <p id="account-modal-subtitle" style={{ color: 'var(--text-secondary)', margin: 0 }}>
              {filtered.length} total cases detected for this account.
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="table-container">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Problem</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="account-ticket-table-body">
              {filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      No tickets found for this account.
                    </td>
                  </tr>
                )
                : filtered.map(t => {
                  const severity = (t.severity || 'Medium').toLowerCase()
                  const status = (t.status || 'analyzed').replace('_', ' ')
                  return (
                    <tr key={t.id}>
                      <td className="ticket-id">#{t.id}</td>
                      <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.problem_summary}>
                        {t.problem_summary}
                      </td>
                      <td><span className={`status-badge status-${severity}`}>{severity}</span></td>
                      <td><span className={`status-pill status-${t.status}`}>{status}</span></td>
                      <td>
                        <button className="primary small" onClick={() => onShowTicket(t.id)}>
                          Inspect
                        </button>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
