import { useState, useEffect } from 'react'
import { getAccounts } from '../api'

export default function Accounts({ tickets, onShowAccountDetail, isActive }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isActive) {
      setLoading(true)
      getAccounts()
        .then(data => setAccounts(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false))
    }
  }, [isActive])

  if (loading) {
    return <div className="placeholder-content"><h4>Loading account data...</h4></div>
  }

  if (!accounts.length) {
    return <div className="placeholder-content"><h4>No account data available</h4></div>
  }

  const avgScore = accounts.reduce((a, c) => a + c.health_score, 0) / accounts.length
  let globalText = 'Stable', globalBg = 'rgba(16,185,129,0.1)', globalColor = '#10b981'
  if (avgScore <= 50) { globalText = 'Critical'; globalBg = 'rgba(244,63,94,0.1)'; globalColor = '#f43f5e' }
  else if (avgScore <= 80) { globalText = 'Under Pressure'; globalBg = 'rgba(251,191,36,0.1)'; globalColor = '#fbbf24' }

  const sorted = [...accounts].sort((a, b) => a.health_score - b.health_score)

  return (
    <section className="accounts-section">
      <div className="section-header">
        <div>
          <h2>Account Pulse</h2>
          <p className="section-sub">Customer health monitoring</p>
        </div>
        <span
          id="global-health-indicator"
          className="status-badge"
          style={{ background: globalBg, color: globalColor, border: `1px solid ${globalColor}30`, padding: '6px 16px', borderRadius: '8px' }}
        >
          {globalText}
        </span>
      </div>

      <div id="accounts-grid" className="accounts-grid">
        {sorted.map(acc => {
          const scoreColor = acc.health_score > 80 ? '#10b981' : acc.health_score > 50 ? '#fbbf24' : '#f43f5e'
          return (
            <div
              key={acc.company_name}
              className="account-card"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}
            >
              <div className="health-bar" style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: scoreColor }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '24px' }}>{acc.company_name}</h4>
                  <span style={{ fontSize: '17px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Status</span>
                </div>
                <span className="status-badge" style={{ background: `${scoreColor}15`, color: scoreColor, border: `1px solid ${scoreColor}30`, fontSize: '16px', padding: '4px 10px', borderRadius: '6px' }}>
                  {acc.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px' }}>
                  <label style={{ display: 'block', fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Tickets</label>
                  <span style={{ fontSize: '22px', fontWeight: 600 }}>{acc.total_tickets}</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px' }}>
                  <label style={{ display: 'block', fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Open Cases</label>
                  <span style={{ fontSize: '22px', fontWeight: 600, color: acc.open_tickets > 0 ? '#fbbf24' : 'inherit' }}>{acc.open_tickets}</span>
                </div>
              </div>

              <button
                className="secondary small"
                style={{ width: '100%', marginTop: '20px', fontSize: '18px', cursor: 'pointer' }}
                onClick={() => onShowAccountDetail(acc.company_name)}
              >
                View Intelligence Deep-Dive
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
