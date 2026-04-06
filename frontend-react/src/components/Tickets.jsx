import { useState } from 'react'
import { deleteTicket, clearTickets } from '../api'

const highlight = (text, q) => {
  if (!q || !text) return text || ''
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="search-highlight">$1</mark>')
}

const CAT_COLORS = {
  'Account Access': '#668f45',
  'Sensor Connectivity': '#3b82f6',
  'Bug': '#ef4444',
  'Platform Configuration': '#ffca00',
  'Billing': '#f59e0b',
  'Technical Support': '#6366f1',
  'Other': '#64748b'
}

export default function Tickets({ tickets, onShowTicket, showToast, refreshData }) {
  const [search, setSearch] = useState('')

  const query = search.toLowerCase().trim()
  const pendingTickets = tickets.filter(t => t.status === 'pending_review')
  const displayed = query
    ? pendingTickets.filter(t =>
        (t.problem_summary || '').toLowerCase().includes(query) ||
        (t.company_name || '').toLowerCase().includes(query) ||
        (t.issue_category || '').toLowerCase().includes(query)
      )
    : pendingTickets

  async function handleDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return
    try {
      await deleteTicket(id)
      showToast('Ticket deleted successfully')
      refreshData()
    } catch (err) {
      showToast('Error deleting ticket', 'error')
    }
  }

  const statusBadgeStyle = (status) => {
    const colors = {
      synced: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
      pending_review: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
      analyzed: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
      open: { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' }
    };
    const theme = colors[status] || colors.open;
    return {
      padding: '8px 16px',
      borderRadius: '10px',
      fontSize: '15px',
      fontWeight: 900,
      textTransform: 'uppercase',
      background: theme.bg,
      color: theme.text,
      border: `2px solid ${theme.border}`,
      display: 'inline-block'
    };
  };

  const thStyle = {
    padding: '14px 18px',
    background: '#000000',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  return (
    <section className="tickets-section" style={{ background: '#f8fafc', padding: '40px', borderRadius: '32px', fontFamily: "'Inter', sans-serif" }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h2 style={{ fontSize: '42px', fontWeight: 900, color: '#000000', marginBottom: '12px', letterSpacing: '-0.04em' }}>Support Ticket Intelligence</h2>
          <p style={{ color: '#1e293b', fontSize: '20px', fontWeight: 600, opacity: 0.8 }}>Real-time analysis and triage for all incoming requests.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <span style={{ marginLeft: '12px', fontSize: '20px' }}>🔍</span>
            <input
              type="text"
              placeholder="Filter tickets..."
              style={{ border: 'none', padding: '8px 0', fontSize: '16px', width: '250px', outline: 'none', color: '#1e293b', fontWeight: 600 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => refreshData()}
            style={{ 
              background: '#3b82f6', 
              color: '#ffffff', 
              padding: '12px 24px', 
              borderRadius: '14px', 
              border: 'none', 
              fontSize: '16px', 
              fontWeight: 800, 
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="records-card" style={{ 
        background: '#ffffff', 
        borderRadius: '32px', 
        border: '2px solid #000000', 
        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.15)', 
        overflow: 'hidden' 
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '80px' }}>ID</th>
              <th style={{ ...thStyle, width: '250px' }}>Company</th>
              <th style={{ ...thStyle }}>Problem Summary (AI)</th>
              <th style={{ ...thStyle, width: '150px' }}>Severity</th>
              <th style={{ ...thStyle, width: '120px' }}>Confidence</th>
              <th style={{ ...thStyle, width: '180px' }}>Status</th>
              <th style={{ ...thStyle, width: '100px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '100px', color: '#64748b', fontSize: '20px' }}>
                  {query ? `No matching tickets found for "${query}"` : "No tickets pending review."}
                </td>
              </tr>
            ) : displayed.map(t => {
              const customerName = t.company_name || 'Royal VIVBuisman'
              const severity = (t.severity || 'Medium').toLowerCase()
              const status = t.status || 'analyzed'
              
              return (
                <tr 
                  key={t.id} 
                  onClick={() => onShowTicket(t.id)} 
                  style={{ borderBottom: '1px solid #e2e8f0', transition: 'all 0.2s ease', cursor: 'pointer' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: '16px 20px', color: '#64748b', fontWeight: 800, fontSize: '18px' }}>#{t.id}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=f1f5f9&color=668f45&bold=true`}
                        alt=""
                        style={{ width: '45px', height: '45px', borderRadius: '10px' }}
                      />
                      <span style={{ fontWeight: 900, color: '#000000', fontSize: '18px' }} dangerouslySetInnerHTML={{ __html: highlight(customerName, query) }} />
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', background: '#f0f9ff', borderLeft: '2px solid #e2e8f0' }}>
                    <span style={{ color: '#000000', fontSize: '17px', fontWeight: 900, lineHeight: '1.5' }} dangerouslySetInnerHTML={{ __html: highlight(t.problem_summary, query) }} />
                  </td>
                  <td style={{ padding: '16px 20px', borderLeft: '1px solid #e2e8f0' }}>
                    <span className={`severity-badge-${severity}`} style={{ fontSize: '17px', fontWeight: 800, textTransform: 'uppercase' }}>
                      {severity.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', borderLeft: '1px solid #e2e8f0' }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: t.confidence_score >= 80 ? '#059669' : (t.confidence_score >= 60 ? '#d97706' : '#dc2626'),
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: '16px',
                      textAlign: 'center',
                      display: 'inline-block',
                      minWidth: '60px'
                    }}>
                      {Math.round(t.confidence_score || 0)}%
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', borderLeft: '1px solid #e2e8f0' }}>
                    <span style={statusBadgeStyle(status)}>
                      {status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', borderLeft: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <button
                      onClick={(e) => handleDelete(e, t.id)}
                      style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '24px', transition: 'all 0.2s ease' }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseOut={(e) => e.currentTarget.style.color = '#cbd5e1'}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
