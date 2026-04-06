import { useState } from 'react'
import { consultAI } from '../api'

export default function ConsultAIDesk({ showToast }) {
  const [problem, setProblem] = useState('')
  const [solution, setSolution] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleConsult = async (e) => {
    e.preventDefault()
    if (!problem.trim()) {
      showToast('Please describe the problem first', 'error')
      return
    }

    setLoading(true)
    setResult(null)
    try {
      const data = await consultAI(problem, solution)
      setResult(data)
      showToast('AI Consultation Complete! 🤖')
    } catch (err) {
      showToast('Failed to consult AI', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="consult-ai-section" style={{ 
      padding: '40px 24px', 
      maxWidth: '1300px', 
      margin: '0 auto',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Background Glows */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(102, 143, 69, 0.15) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: -1 }}></div>
      <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: -1 }}></div>

      <div className="section-header" style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h2 style={{ 
          fontSize: '42px', 
          fontWeight: 950, 
          letterSpacing: '-1px',
          background: 'linear-gradient(135deg, #1e293b 0%, #668f45 50%, #3b82f6 100%)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          marginBottom: '10px' 
        }}>
          Consult AI Desk
        </h2>
        <p style={{ fontSize: '18px', color: '#64748b', maxWidth: '800px', margin: '0 auto', lineHeight: '1.5', fontWeight: 500 }}>
          Experience the future of support. Harness the deep intelligence of the <span style={{ color: '#668f45', fontWeight: 800 }}>Gemini Support Engine</span> to parse complex problems in seconds.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: result ? '1fr 1.3fr' : '1fr', 
        gap: '50px', 
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        alignItems: 'start'
      }}>
        {/* Input Form Card */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(20px)',
          padding: '40px', 
          borderRadius: '32px', 
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.06)', 
          border: '1px solid rgba(255, 255, 255, 0.7)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', background: 'linear-gradient(90deg, #668f45, #3b82f6)' }}></div>
          
          <form onSubmit={handleConsult}>
            <div style={{ marginBottom: '40px' }}>
              <label style={labelHeaderStyle}>Problem Context</label>
              <div style={{ position: 'relative' }}>
                <textarea
                  placeholder="Paste details here..."
                  style={inputStyle(true)}
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                />
                <div style={{ position: 'absolute', bottom: '15px', right: '15px', color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>
                  {problem.length} chars
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
              <label style={labelHeaderStyle}>Optional: Partial Solution</label>
              <input
                type="text"
                placeholder="What have you tried?"
                style={inputStyle(false)}
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="consult-btn"
              style={submitButtonStyle(loading)}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                {loading ? 'Analyzing Neural Patterns...' : 'Invoke Intelligence Engine'}
              {!loading && <span style={{ fontSize: '24px' }}>✨</span>}
              </span>
            </button>
          </form>
        </div>

        {/* Results Visualizer */}
        <div style={{ position: 'relative', minHeight: '600px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '30px', animation: 'pulse 2s infinite' }}>
              <div className="loader-ring"></div>
              <p style={{ fontSize: '24px', fontWeight: 700, color: '#64748b' }}>Consulting LLM Clusters...</p>
            </div>
          )}

          {result && !loading && (
            <div style={{ 
              background: 'white', 
              padding: '50px', 
              borderRadius: '40px', 
              boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.12)', 
              border: '1px solid #f1f5f9',
              animation: 'slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h3 style={{ fontSize: '28px', fontWeight: 900, color: '#1e293b' }}>Intelligence Report</h3>
                <div style={{ 
                  background: 'rgba(102, 143, 69, 0.1)', 
                  color: '#668f45', 
                  padding: '10px 20px', 
                  borderRadius: '100px', 
                  fontWeight: 800, 
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#668f45', animation: 'ping 2s infinite' }}></div>
                  Confidence Score: {Math.round(result.confidence_score)}%
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                <ReportTag bg="#f0f9ff" color="#0369a1" label="Domain" value={result.issue_category} />
                <ReportTag bg="#f0fdf4" color="#15803d" label="Entity" value={result.issue_subcategory} />
                <ReportTag bg="#fff1f2" color="#be123c" label="Impact" value={result.severity || 'Medium'} />
                <ReportTag bg="#f5f3ff" color="#6d28d9" label="Action" value={result.resolution_type} />
              </div>

              <div style={{ spaceY: '30px' }}>
                <div style={{ marginBottom: '35px' }}>
                  <h4 style={subLabelStyle}>Precise Summary</h4>
                  <p style={paragraphStyle}>{result.problem_summary}</p>
                </div>

                <div style={{ marginBottom: '35px' }}>
                  <h4 style={subLabelStyle}>Root Cause Identification</h4>
                  <p style={paragraphStyle}>{result.root_cause}</p>
                </div>

                <div style={{ marginBottom: '40px' }}>
                  <h4 style={subLabelStyle}>Recommended Resolution</h4>
                  <div style={{ 
                    padding: '24px', 
                    borderRadius: '16px', 
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                    borderLeft: '5px solid #668f45',
                    fontSize: '17px',
                    lineHeight: '1.6',
                    color: '#334155',
                    fontWeight: 500,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    {result.solution_summary}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                 <button 
                   onClick={() => { setProblem(''); setSolution(''); setResult(null); }}
                   style={secondaryButtonStyle}
                 >
                   Clear Desk
                 </button>
                 <button 
                   onClick={() => { navigator.clipboard.writeText(result.solution_summary); showToast('Solution Copied to Clipboard!'); }}
                   style={primaryActionStyle}
                 >
                   Apply Suggested Solution
                 </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.8; }
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .consult-btn {
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .consult-btn:hover:not(:disabled) {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(102, 143, 69, 0.3);
        }
        .consult-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .loader-ring {
          width: 80px;
          height: 80px;
          border: 8px solid #f1f5f9;
          border-top: 8px solid #668f45;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}

function ReportTag({ bg, color, label, value }) {
  return (
    <div style={{ 
      background: bg, 
      padding: '16px 20px', 
      borderRadius: '20px', 
      border: `1px solid ${color}20`,
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    }}>
      <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: color, opacity: 0.6 }}>{label}</span>
      <span style={{ fontSize: '17px', fontWeight: 800, color: color }}>{value}</span>
    </div>
  )
}

const labelHeaderStyle = {
  display: 'block',
  fontSize: '24px',
  fontWeight: 950,
  color: '#000000',
  marginBottom: '15px',
  letterSpacing: '-1px'
}

const inputStyle = (isArea) => ({
  width: '100%', 
  height: isArea ? '260px' : '72px', 
  borderRadius: '18px', 
  border: '2px solid #e2e8f0', 
  padding: '20px', 
  fontSize: '18px', 
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'all 0.3s',
  background: '#ffffff',
  color: '#000000',
  fontWeight: 600,
  resize: 'none',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
})

const modeButtonStyle = (active) => ({
  flex: 1,
  padding: '20px',
  borderRadius: '20px',
  border: '2px solid',
  borderColor: active ? '#668f45' : '#f1f5f9',
  background: active ? '#668f4510' : 'white',
  color: active ? '#668f45' : '#64748b',
  cursor: 'pointer',
  transition: 'all 0.3s',
  display: 'flex',
  alignItems: 'center',
  gap: '15px'
})

const submitButtonStyle = (loading) => ({
  width: '100%',
  padding: '20px',
  borderRadius: '18px',
  background: loading ? '#94a3b8' : 'linear-gradient(135deg, #668f45 0%, #4d7a2f 100%)',
  color: 'white',
  fontSize: '20px',
  fontWeight: 800,
  border: 'none',
  cursor: loading ? 'not-allowed' : 'pointer',
  boxShadow: '0 10px 25px rgba(102, 143, 69, 0.22)'
})

const subLabelStyle = {
  fontSize: '13px',
  fontWeight: 800,
  textTransform: 'uppercase',
  color: '#94a3b8',
  letterSpacing: '1px',
  marginBottom: '10px'
}

const paragraphStyle = {
  fontSize: '18px',
  lineHeight: '1.6',
  color: '#475569',
  fontWeight: 500
}

const secondaryButtonStyle = {
  flex: 1,
  padding: '16px',
  borderRadius: '14px',
  background: '#f1f5f9',
  border: 'none',
  fontSize: '16px',
  fontWeight: 700,
  color: '#475569',
  cursor: 'pointer',
  transition: 'background 0.2s'
}

const primaryActionStyle = {
  flex: 2,
  padding: '16px',
  borderRadius: '14px',
  background: '#1e293b',
  border: 'none',
  fontSize: '16px',
  fontWeight: 700,
  color: 'white',
  cursor: 'pointer',
  transition: 'transform 0.2s'
}
