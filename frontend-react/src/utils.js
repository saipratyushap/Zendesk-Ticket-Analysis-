export function repairJSON(str) {
  if (!str) return null
  let clean = str.trim()
  const ta = document.createElement('textarea')
  ta.innerHTML = clean
  clean = ta.value
  clean = clean.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  let processed = clean
  for (let i = 0; i < 3; i++) {
    try {
      const fc = processed.trim()[0]
      if (fc === '{' || fc === '[') return JSON.parse(processed)
    } catch (e) {}
    try {
      const parsed = JSON.parse(processed)
      if (parsed && typeof parsed === 'object') return parsed
      if (typeof parsed === 'string') { processed = parsed; continue }
    } catch (e) {}
    if (processed.startsWith('"') && processed.endsWith('"')) processed = processed.slice(1, -1)
    const unescaped = processed.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
    if (unescaped === processed) break
    processed = unescaped
  }

  const fb = processed.indexOf('{'), lb = processed.lastIndexOf('}')
  const fk = processed.indexOf('['), lk = processed.lastIndexOf(']')
  let start = -1, end = -1
  if (fb !== -1 && (fk === -1 || fb < fk)) { start = fb; end = lb }
  else if (fk !== -1) { start = fk; end = lk }
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(processed.substring(start, end + 1)) } catch (e) {
      const fixed = processed.substring(start, end + 1).replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3')
      try { return JSON.parse(fixed) } catch (e2) {}
    }
  }

  if (processed.length > 5) {
    return {
      problem: processed.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n'),
      customer_email: (processed.match(/\S+@\S+\.\S+/) || ['unknown@customer.com'])[0]
    }
  }
  return null
}

export function parseCSV(csv) {
  const lines = csv.split(/\r?\n/)
  if (lines.length < 2) return []
  const splitLine = (line) => {
    const result = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { result.push(cur.trim().replace(/^"|"$/g, '')); cur = '' }
      else cur += ch
    }
    result.push(cur.trim().replace(/^"|"$/g, ''))
    return result
  }
  const headers = splitLine(lines[0]).map(h => h.trim().toLowerCase())
  const results = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cols = splitLine(lines[i])
    const obj = {}
    headers.forEach((h, idx) => {
      let key = h
      if (h.includes('prob') || h.includes('issue') || h.includes('summary')) key = 'problem'
      if (h.includes('sol') || h.includes('resol') || h.includes('action')) key = 'solution'
      if (h.includes('email') || h.includes('customer') || h.includes('contact')) key = 'customer_email'
      obj[key] = cols[idx] || ''
    })
    if (obj.problem) results.push(obj)
  }
  return results
}
