export const API_URL = '/api';

export const getTickets = () => fetch(`${API_URL}/tickets`).then(r => r.json());
export const getStats = () => fetch(`${API_URL}/stats`).then(r => r.json());
export const getAccounts = () => fetch(`${API_URL}/accounts/pulse`).then(r => r.json());
export const getReports = () => fetch(`${API_URL}/reports/stats`).then(r => r.json());
export const getKB = () => fetch(`${API_URL}/kb`).then(r => r.json());
export const getKBArticle = (id) => fetch(`${API_URL}/kb/${id}`).then(r => r.json());
export const getKBSuggestions = (ticketId) => fetch(`${API_URL}/kb/suggest?ticket_id=${ticketId}`).then(r => r.json());
export const searchKB = (q) => fetch(`${API_URL}/kb/search?q=${encodeURIComponent(q)}`).then(r => r.json());

export const createTicket = (data) => fetch(`${API_URL}/tickets`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
}).then(r => r.json());

export const deleteTicket = (id) => fetch(`${API_URL}/tickets/${id}`, { method: 'DELETE' }).then(r => r.json());
export const clearTickets = () => fetch(`${API_URL}/tickets`, { method: 'DELETE' }).then(r => r.json());
export const seedTickets = () => fetch(`${API_URL}/tickets/seed`, { method: 'POST' }).then(r => r.json());
export const closeTicket = (id) => fetch(`${API_URL}/tickets/${id}/close`, { method: 'POST' }).then(r => r.json());

export const approveTicket = (id) => fetch(`${API_URL}/tickets/${id}/approve`, { method: 'PATCH' }).then(r => r.json());

export const consultAI = (problem, solution = '') => fetch(`${API_URL}/ai/consult`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ problem, solution })
}).then(r => r.json());

export const getDatabaseView = () => fetch(`${API_URL}/database-view`).then(r => r.json());
