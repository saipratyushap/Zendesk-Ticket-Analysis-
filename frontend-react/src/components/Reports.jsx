import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#475569', font: { family: "'Inter', sans-serif", size: 12 }, padding: 20, usePointStyle: true }
    },
    tooltip: {
      backgroundColor: '#ffffff',
      titleColor: '#1e293b',
      bodyColor: '#64748b',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 12,
      displayColors: true,
      caretSize: 0,
      cornerRadius: 8,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    }
  },
  interaction: { intersect: false, mode: 'index' }
}

const LINEAR_SCALES = {
  x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Inter' } } },
  y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { family: 'Inter' } } }
}

function useChart(ref, buildConfig, deps) {
  const chartRef = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, buildConfig())
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, deps)
}

export default function Reports({ stats, isActive }) {
  const categoryRef = useRef(null)
  const volumeRef = useRef(null)
  const resolutionRef = useRef(null)
  const subcategoryRef = useRef(null)
  const learningRef = useRef(null)
  const statusRef = useRef(null)
  const performanceRef = useRef(null)
  const rootCauseRef = useRef(null)
  const solutionRef = useRef(null)
  const impactRef = useRef(null)

  const sparkOpenRef = useRef(null)
  const sparkResRef = useRef(null)
  const sparkCsatRef = useRef(null)
  const sparkSlaRef = useRef(null)

  const sparkCharts = useRef({})

  function makeSparkline(ctx, color) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 40)
    gradient.addColorStop(0, `${color}33`)
    gradient.addColorStop(1, 'transparent')
    return new Chart(ctx, {
      type: 'line',
      data: { labels: [1,2,3,4,5,6,7,8,9,10], datasets: [{ data: [], borderColor: color, backgroundColor: gradient, borderWidth: 2, pointRadius: 0, tension: 0.45, fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } }
    })
  }

  useEffect(() => {
    if (!isActive) return
    if (sparkOpenRef.current && !sparkCharts.current.open) sparkCharts.current.open = makeSparkline(sparkOpenRef.current.getContext('2d'), '#668f45')
    if (sparkResRef.current && !sparkCharts.current.res) sparkCharts.current.res = makeSparkline(sparkResRef.current.getContext('2d'), '#668f45')
    if (sparkCsatRef.current && !sparkCharts.current.csat) sparkCharts.current.csat = makeSparkline(sparkCsatRef.current.getContext('2d'), '#ffca00')
    if (sparkSlaRef.current && !sparkCharts.current.sla) sparkCharts.current.sla = makeSparkline(sparkSlaRef.current.getContext('2d'), '#668f45')
  }, [isActive])

  useEffect(() => {
    if (!stats || !isActive) return

    const updateSpark = (key, data) => { if (sparkCharts.current[key] && data) { sparkCharts.current[key].data.datasets[0].data = data; sparkCharts.current[key].update('none') } }
    const sl = stats.sparklines || {}
    updateSpark('open', sl.open)
    updateSpark('res', sl.response)
    updateSpark('csat', sl.csat)
    updateSpark('sla', sl.sla)

    const createChart = (ref, config) => {
      if (!ref.current) return
      const existing = Chart.getChart(ref.current)
      if (existing) existing.destroy()
      return new Chart(ref.current, config)
    }

    // 1. Most Common Problems
    createChart(subcategoryRef, {
      type: 'bar',
      data: {
        labels: (stats.common_problems || []).map(p => p.label),
        datasets: [{
          label: 'Frequency',
          data: (stats.common_problems || []).map(p => p.count),
          backgroundColor: '#668f45',
          borderRadius: 8
        }]
      },
      options: { 
        ...BASE_OPTIONS, 
        indexAxis: 'y', 
        layout: { padding: { left: 100 } },
        scales: { 
          x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 14, weight: 'bold' } } },
          y: { 
            grid: { display: false }, 
            ticks: { 
              font: { size: 14, weight: '600' }, 
              color: '#1e293b',
              callback: function(value) {
                const label = this.getLabelForValue(value);
                return label.length > 50 ? label.substring(0, 47) + '...' : label;
              }
            } 
          }
        },
        plugins: { 
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => items[0].label, // Show full label in tooltip title
              label: (item) => `Frequency: ${item.raw}`
            }
          }
        } 
      }
    })

    // Helper: strip parenthetical descriptions from taxonomy labels for clean chart display
    const shortLabel = label => (label || '').replace(/\s*\(.*?\)\s*/g, '').trim() || label

    // 2. AI Intelligence: Areas of Solution Distribution
    createChart(rootCauseRef, {
      type: 'doughnut',
      data: {
        labels: (stats.product_area_stats || []).map(r => shortLabel(r.label)),
        datasets: [{
          data: (stats.product_area_stats || []).map(r => r.count),
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'],
          borderWidth: 0,
          cutout: '65%'
        }]
      },
      options: { 
        ...BASE_OPTIONS, 
        plugins: { 
          legend: { 
            position: 'right', 
            labels: { font: { size: 14, weight: '600' }, usePointStyle: true, padding: 20 } 
          } 
        } 
      }
    })

    // 4. Problem Distribution by Category
    createChart(statusRef, {
      type: 'doughnut',
      data: {
        labels: (stats.categories || []).map(c => shortLabel(c.label)),
        datasets: [{
          data: (stats.categories || []).map(c => c.count),
          backgroundColor: ['#668f45', '#3b82f6', '#ffca00', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'],
          borderWidth: 0,
          cutout: '65%'
        }]
      },
      options: { 
        ...BASE_OPTIONS, 
        plugins: { 
          legend: { 
            position: 'bottom', 
            labels: { font: { size: 14, weight: '600' }, usePointStyle: true, padding: 20 } 
          } 
        } 
      }
    })

    // 5. Top Impacting Accounts (Meaningful Replacement)
    createChart(volumeRef, {
      type: 'bar',
      data: {
        labels: (stats.top_companies || []).map(c => c.label),
        datasets: [{
          label: 'Ticket Count',
          data: (stats.top_companies || []).map(c => c.count),
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0,0,0,400)
            g.addColorStop(0, '#f59e0b'); g.addColorStop(1, '#fbbf24')
            return g
          },
          borderRadius: 8
        }]
      },
      options: {
        ...BASE_OPTIONS,
        scales: {
          x: { grid: { display: false }, ticks: { font: { weight: '600' } } },
          y: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    })

    // 3. Strategic Business Signals (Donut Chart)
    createChart(solutionRef, {
      type: 'doughnut',
      data: {
        labels: (stats.business_signals_stats || []).map(s => s.label),
        datasets: [{
          data: (stats.business_signals_stats || []).map(s => s.count),
          backgroundColor: ['#ef4444', '#3b82f6', '#10b981'],
          borderWidth: 0,
          hoverOffset: 15
        }]
      },
      options: {
        ...BASE_OPTIONS,
        cutout: '65%',
        plugins: {
          legend: { 
            display: true,
            position: 'bottom',
            labels: {
              padding: 25,
              usePointStyle: true,
              font: { size: 14, weight: '700' }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: 18,
            cornerRadius: 16,
            titleFont: { size: 18, weight: 'bold' },
            bodyFont: { size: 15 },
            displayColors: true,
            callbacks: {
              label: (item) => {
                const label = item.label;
                const desc = {
                  'Churn Risk': '🚩 Critical: Potential customer loss detected.',
                  'Upsell Opportunity': '💎 Growth: Value expansion potential identified.',
                  'Expansion Signals': '📈 Scale: Infrastructure expansion signal detected.'
                }[label] || 'AI Intelligence Signal';
                return [`Count: ${item.raw}`, `Analysis: ${desc}`];
              }
            }
          }
        }
      }
    })

    // Charts were extensively updated above for the redesign.
    // Removed obsolete chart initializers here to prevent double-initialization.

  }, [stats, isActive])

  if (!stats) return <div className="placeholder-content"><h4>Loading analytics...</h4></div>
  const m = stats.metrics || {}

  return (
    <section className="reports-section-premium" style={{ 
      padding: '40px', 
      background: '#f8fafc', 
      borderRadius: '32px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Background Glows */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(102, 143, 69, 0.1) 0%, transparent 70%)', filter: 'blur(100px)', zIndex: 0 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)', filter: 'blur(120px)', zIndex: 0 }}></div>

      <div className="reports-header-refined" style={{ position: 'relative', zIndex: 1, marginBottom: '60px', textAlign: 'left' }}>
        <h1 style={{ 
          color: '#000000', 
          fontSize: '56px', 
          fontWeight: 950, 
          letterSpacing: '-0.05em',
          marginBottom: '10px'
        }}>
          Zendesk AI Dashboard
        </h1>
        <p style={{ color: '#475569', fontSize: '24px', fontWeight: 600, opacity: 0.8 }}>Advanced analytics and trend mapping for all analyzed tickets.</p>
      </div>

      {/* KPI GRID */}
      <div className="metrics-row" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        {[
          { label: 'Total Tickets', val: m.total || '0', trend: 'Total Volume', color: '#1e293b', ref: sparkOpenRef, icon: '📄', border: 'linear-gradient(90deg, #1e293b, #64748b)' },
          { label: 'Intelligence Score', val: m.avg_intelligence || '0%', trend: 'Avg confidence', color: '#3b82f6', ref: sparkSlaRef, icon: '🧠', border: 'linear-gradient(90deg, #3b82f6, #2563eb)' },
          { label: 'Urgent (Critical)', val: m.critical_count || '0', trend: 'High Priority', color: '#ef4444', ref: sparkResRef, icon: '🚨', border: 'linear-gradient(90deg, #ef4444, #dc2626)' },
          { label: 'Manual Audit', val: m.pending_count || '0', trend: 'Needs Review', color: '#f59e0b', ref: sparkCsatRef, icon: '⏳', border: 'linear-gradient(90deg, #f59e0b, #d97706)' }
        ].map((card, i) => (
          <div key={i} className="metric-card-glass" style={{ 
            background: 'rgba(255, 255, 255, 0.8)', 
            backdropFilter: 'blur(20px)',
            padding: '35px', 
            borderRadius: '32px', 
            border: '1px solid rgba(255, 255, 255, 0.7)', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
            transition: 'transform 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', background: card.border }}></div>
            
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
              <span className="metric-label" style={{ color: '#64748b', fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
              <span className="metric-icon" style={{ 
                fontSize: '24px', 
                background: '#f8fafc', 
                width: '44px', 
                height: '44px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderRadius: '12px',
              }}>{card.icon}</span>
            </div>
            <div className="metric-value" style={{ fontSize: '52px', fontWeight: 950, color: '#000000', marginBottom: '15px', letterSpacing: '-0.04em', lineHeight: 1 }}>{card.val}</div>
            <div className="metric-footer" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '25px' }}>
              <span style={{ color: card.color, fontSize: '18px', fontWeight: 800 }}>{card.trend}</span>
            </div>
            <div className="metric-sparkline" style={{ height: '50px', opacity: 0.6 }}><canvas ref={card.ref}></canvas></div>
          </div>
        ))}
      </div>

       {/* 1. MOST COMMON PROBLEMS */}
      <div className="charts-row full-width-card" style={{ position: 'relative', zIndex: 1, marginBottom: '40px' }}>
        <div className="chart-card-glass" style={{ 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(20px)',
          padding: '50px', 
          borderRadius: '40px', 
          border: '1px solid rgba(255, 255, 255, 0.7)', 
          boxShadow: '0 30px 60px rgba(0,0,0,0.06)' 
        }}>
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '38px', fontWeight: 950, color: '#000000', marginBottom: '10px', letterSpacing: '-0.03em' }}>1. Most Common Problems</h3>
            <p style={{ color: '#475569', fontSize: '20px', fontWeight: 600, opacity: 0.7 }}>Frequency of unique problem summaries identified by AI.</p>
          </div>
          <div className="chart-container" style={{ height: '600px' }}><canvas ref={subcategoryRef}></canvas></div>
        </div>
      </div>

      <div className="charts-row" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
        {/* 2. AREAS OF SOLUTION DISTRIBUTION */}
        <div className="chart-card-glass" style={{ 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(20px)',
          padding: '45px', 
          borderRadius: '40px', 
          border: '1px solid rgba(255, 255, 255, 0.7)', 
          boxShadow: '0 30px 60px rgba(0,0,0,0.06)' 
        }}>
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '32px', fontWeight: 950, color: '#000000', marginBottom: '10px', letterSpacing: '-0.03em' }}>Areas of Solution Distribution</h3>
            <p style={{ color: '#475569', fontSize: '18px', fontWeight: 600, opacity: 0.7 }}>Distribution of technical focal areas being resolved.</p>
          </div>
          <div className="chart-container" style={{ height: '400px' }}><canvas ref={rootCauseRef}></canvas></div>
        </div>
        
        {/* 4. PROBLEM DISTRIBUTION BY CATEGORY */}
        <div className="chart-card-glass" style={{ 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(20px)',
          padding: '45px', 
          borderRadius: '40px', 
          border: '1px solid rgba(255, 255, 255, 0.7)', 
          boxShadow: '0 30px 60px rgba(0,0,0,0.06)' 
        }}>
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '32px', fontWeight: 950, color: '#000000', marginBottom: '10px', letterSpacing: '-0.03em' }}>4. Problem Distribution by Category</h3>
            <p style={{ color: '#475569', fontSize: '18px', fontWeight: 600, opacity: 0.7 }}>System component breakdown generating analyzed volume.</p>
          </div>
          <div className="chart-container" style={{ height: '400px' }}><canvas ref={statusRef}></canvas></div>
        </div>
      </div>

      <div className="charts-row" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '32px' }}>
        {/* 5. TOP IMPACTING ACCOUNTS */}
        <div className="chart-card-glass" style={{ 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(20px)',
          padding: '45px', 
          borderRadius: '40px', 
          border: '1px solid rgba(255, 255, 255, 0.7)', 
          boxShadow: '0 30px 60px rgba(0,0,0,0.06)' 
        }}>
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '32px', fontWeight: 950, color: '#000000', marginBottom: '10px', letterSpacing: '-0.03em' }}>5. Top Impacting Accounts</h3>
            <p style={{ color: '#475569', fontSize: '18px', fontWeight: 600, opacity: 0.7 }}>Highest ticket volume generated by client organizations.</p>
          </div>
          <div className="chart-container" style={{ height: '500px' }}><canvas ref={volumeRef}></canvas></div>
        </div>

        {/* 3. STRATEGIC BUSINESS SIGNALS */}
        <div className="chart-card-glass" style={{ 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(20px)',
          padding: '45px', 
          borderRadius: '40px', 
          border: '1px solid rgba(255, 255, 255, 0.7)', 
          boxShadow: '0 30px 60px rgba(0,0,0,0.06)' 
        }}>
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '32px', fontWeight: 950, color: '#000000', marginBottom: '10px', letterSpacing: '-0.03em' }}>Strategic Business Signals</h3>
            <p style={{ color: '#475569', fontSize: '18px', fontWeight: 600, opacity: 0.7 }}>AI-detected churn risks, upsells, and expansion opportunities.</p>
          </div>
          <div className="chart-container" style={{ height: '500px' }}><canvas ref={solutionRef}></canvas></div>
        </div>
      </div>

      <style>{`
        .metric-card-glass:hover {
          transform: translateY(-8px);
          box-shadow: 0 40px 80px rgba(0,0,0,0.08);
          background: rgba(255, 255, 255, 0.95) !important;
        }
        .chart-card-glass:hover {
          background: rgba(255, 255, 255, 1) !important;
          border-color: #668f4544;
          transform: scale(1.005);
          transition: all 0.4s ease;
        }
      `}</style>
    </section>
  )
}
