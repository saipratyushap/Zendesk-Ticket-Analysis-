import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#475569', font: { family: "'Outfit', sans-serif", size: 12 }, padding: 20, usePointStyle: true }
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
  x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Outfit' } } },
  y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { family: 'Outfit' } } }
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
        scales: { 
          x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 14, weight: 'bold' } } },
          y: { grid: { display: false }, ticks: { font: { size: 16, weight: '600' }, color: '#1e293b' } }
        },
        plugins: { legend: { display: false } } 
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

    // 3. Solutions vs Number of Times Provided
    createChart(solutionRef, {
      type: 'bar',
      data: {
        labels: (stats.resolution_type_stats || []).map(s => s.label),
        datasets: [{
          label: 'Times Provided',
          data: (stats.resolution_type_stats || []).map(s => s.count),
          backgroundColor: '#10b981',
          borderRadius: 8
        }]
      },
      options: {
        ...BASE_OPTIONS,
        indexAxis: 'y',
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } },
          y: { grid: { display: false }, ticks: { font: { weight: '600' } } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    })

    // Charts were extensively updated above for the redesign.
    // Removed obsolete chart initializers here to prevent double-initialization.

  }, [stats, isActive])

  if (!stats) return <div className="placeholder-content"><h4>Loading analytics...</h4></div>
  const m = stats.metrics || {}

  return (
    <section className="reports-section-light" style={{ padding: '40px', background: 'white', borderRadius: '24px' }}>
      <div className="reports-header-refined" style={{ marginBottom: '40px', borderBottom: '1px solid #f1f5f9', paddingBottom: '30px' }}>
        <div className="header-left">
          <h1 style={{ color: '#1e293b', fontSize: '34px', fontWeight: 800 }}>Zendesk AI Ticket Analysis</h1>
          <p style={{ color: '#64748b' }}>Advanced analytics and trend mapping for all analyzed tickets.</p>
        </div>
        <div className="header-right">
          {/* Last 30 Days button removed per user request */}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        {[
          { label: 'Total Tickets', val: m.total || '0', trend: '+12%', color: '#668f45', ref: sparkOpenRef, icon: '📄' },
          { label: 'Processed (Synced)', val: m.processed_count || '0', trend: 'Auto-verified', color: '#3b82f6', ref: sparkResRef, icon: '✅' },
          { label: 'Pending Review', val: m.pending_count || '0', trend: 'Awaiting Action', color: '#ffca00', ref: sparkCsatRef, icon: '⏳' },
          { label: 'Problem Clusters', val: m.unique_problems_count || '0', trend: 'Patterns', color: '#668f45', ref: sparkSlaRef, icon: '🧩' }
        ].map((card, i) => (
          <div key={i} className="metric-card-light" style={{ 
            background: 'white', 
            padding: '30px', 
            borderRadius: '24px', 
            border: '1px solid #f1f5f9', 
            boxShadow: '0 10px 20px -5px rgba(0,0,0,0.04)',
            transition: 'transform 0.3s ease'
          }}>
            <div className="metric-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span className="metric-label" style={{ color: '#64748b', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em' }}>{card.label}</span>
              <span className="metric-icon" style={{ 
                fontSize: '28px', 
                background: '#f8fafc', 
                width: '48px', 
                height: '48px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderRadius: '14px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>{card.icon}</span>
            </div>
            <div className="metric-value" style={{ fontSize: '44px', fontWeight: 800, color: '#1e293b', marginBottom: '12px', letterSpacing: '-0.02em', lineHeight: 1 }}>{card.val}</div>
            <div className="metric-footer" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              {card.trend && <span className={`metric-trend ${card.down ? 'down' : 'up'}`} style={{ color: card.down ? '#ef4444' : '#668f45', fontSize: '20px', fontWeight: 700 }}>{card.trend}</span>}
              {card.stars && <span style={{ color: '#ffca00', letterSpacing: '2px', fontSize: '18px' }}>★★★★☆</span>}
            </div>
            <div className="metric-sparkline" style={{ height: '44px' }}><canvas ref={card.ref}></canvas></div>
          </div>
        ))}
      </div>
       {/* 1. MOST COMMON PROBLEMS */}
      <div className="charts-row full-width-card" style={{ marginBottom: '40px' }}>
        <div className="chart-card-light" style={{ background: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>1. Most Common Problems</h3>
            <p style={{ color: '#64748b', fontSize: '20px' }}>Frequency of unique problem summaries across all tickets.</p>
          </div>
          <div className="chart-container" style={{ height: '500px' }}><canvas ref={subcategoryRef}></canvas></div>
        </div>
      </div>

      <div className="charts-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
        {/* 2. AI INTELLIGENCE: AREAS OF SOLUTION DISTRIBUTION */}
        <div className="chart-card-light" style={{ background: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
            <div>
              <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Areas of Solution Distribution</h3>
              <p style={{ color: '#64748b', fontSize: '18px' }}>Distribution of technical areas being resolved.</p>
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distribution</div>
          </div>
          <div className="chart-container" style={{ height: '400px' }}><canvas ref={rootCauseRef}></canvas></div>
        </div>
        {/* 4. PROBLEM DISTRIBUTION BY CATEGORY */}
        <div className="chart-card-light" style={{ background: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>4. Problem Distribution by Category</h3>
            <p style={{ color: '#64748b', fontSize: '18px' }}>System component breakdown generating ticket volume.</p>
          </div>
          <div className="chart-container" style={{ height: '400px' }}><canvas ref={statusRef}></canvas></div>
        </div>
      </div>

      <div className="charts-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '32px', marginBottom: '40px' }}>
        {/* 5. TOP IMPACTING ACCOUNTS */}
        <div className="chart-card-light" style={{ background: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
          <div className="chart-header">
            <h3>5. Top Impacting Accounts</h3>
            <p>Highest ticket volume generated by specific client organizations.</p>
          </div>
          <div className="chart-container" style={{ height: '450px' }}><canvas ref={volumeRef}></canvas></div>
        </div>

        {/* 3. RESOLUTION TYPE BREAKDOWN */}
        <div className="chart-card-light" style={{ background: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Resolution Type Breakdown</h3>
            <p style={{ color: '#64748b', fontSize: '18px' }}>How tickets are being resolved across all categories.</p>
          </div>
          <div className="chart-container" style={{ height: '450px' }}><canvas ref={solutionRef}></canvas></div>
        </div>
      </div>
    </section>
  )
}
