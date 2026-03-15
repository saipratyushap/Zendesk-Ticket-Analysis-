const API_URL = 'http://localhost:5001/api';
const charts = {};
const sparklines = {};

// Highlighting Helper (Global)
const highlight = (text, q) => {
    if (!q || !text) return text || '';
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
};

// Sparkline Default Options for Minimalist Look
const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
    elements: { 
        line: { tension: 0.4, borderWidth: 2, fill: true }, 
        point: { radius: 0 } 
    }
};

function createSparkline(canvasId, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 40);
    gradient.addColorStop(0, `${color}22`);
    gradient.addColorStop(1, 'transparent');

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [1, 2, 3, 4, 5, 6, 7],
            datasets: [{
                data: [],
                borderColor: color,
                backgroundColor: gradient
            }]
        },
        options: sparklineOptions
    });
}
let currentTickets = [];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    // Modal controls - IDs should exist in static HTML
    const mainTicketModal = document.getElementById('modal');
    const importModal = document.getElementById('import-modal');
    const detailsModal = document.getElementById('ticket-details-modal');
    
    document.getElementById('post-ticket-btn').onclick = () => mainTicketModal.classList.add('active');
    
    // Global exposure for inline handlers
    window.closeMainModal = () => { mainTicketModal.classList.remove('active'); document.body.classList.remove('no-scroll'); };
    window.closeImportModal = () => { importModal.classList.remove('active'); document.body.classList.remove('no-scroll'); };
    window.closeDetailsModal = () => { detailsModal.classList.remove('active'); document.body.classList.remove('no-scroll'); };

    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) closeModalBtn.onclick = window.closeMainModal;

    const closeImportBtn = document.getElementById('close-import-modal');
    if (closeImportBtn) closeImportBtn.onclick = window.closeImportModal;

    const closeDetailsBtn = document.getElementById('close-details-modal');
    if (closeDetailsBtn) closeDetailsBtn.onclick = () => { detailsModal.classList.remove('active'); document.body.classList.remove('no-scroll'); };

    const approveBtn = document.getElementById('approve-btn');
    if (approveBtn) approveBtn.onclick = handleApprove;


    // Tab switching (Global)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        };
    });



    const fileInputBulk = document.getElementById('file-input-bulk');
    if (fileInputBulk) {
        fileInputBulk.onchange = (e) => handleBulkFile(e.target.files[0]);
    }

    // Search Filtering Logic (v2.0 - Search Fix)
    const searchInput = document.getElementById('ticket-search');
    if (searchInput) {
        console.log('[v2.0] Search handler attached to:', searchInput);
        searchInput.oninput = () => {
            console.log('[v2.0] Input detected:', searchInput.value);
            updateTicketTable(currentTickets);
        };
    }

    const dropZoneBulk = document.getElementById('drop-zone-bulk');
    if (dropZoneBulk) {
        dropZoneBulk.onclick = () => fileInputBulk.click();
        dropZoneBulk.ondragover = (e) => { e.preventDefault(); dropZoneBulk.classList.add('drag-over'); };
        dropZoneBulk.ondragleave = () => dropZoneBulk.classList.remove('drag-over');
        dropZoneBulk.ondrop = (e) => {
            e.preventDefault();
            dropZoneBulk.classList.remove('drag-over');
            handleBulkFile(e.dataTransfer.files[0]);
        };
    }

    // Form submission
    document.getElementById('ticket-form').onsubmit = handleTicketSubmit;

    // Auto-refresh every 10 seconds
    setInterval(refreshData, 10000);
});

async function initApp() {
    initCharts();
    await refreshData();
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(b => {
        if (b.dataset.page === pageId) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    // Refresh charts if dashboard is active
    if (pageId === 'dashboard') {
        Object.values(charts).forEach(chart => chart.update());
    }

    // Load KB if knowledge-base is active
    if (pageId === 'knowledge-base') {
        fetchKB();
    }

    // Load Reports if active
    if (pageId === 'reports') {
        fetchReports();
    }

    // Load Accounts if active
    if (pageId === 'accounts') {
        fetchAccountPulse();
    }
}

function initCharts() {
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#94a3b8',
                    font: { family: "'Inter', sans-serif", size: 12 },
                    padding: 20,
                    usePointStyle: true
                }
            },
            tooltip: {
                backgroundColor: 'rgba(17, 21, 28, 0.8)',
                titleColor: '#fff',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                caretSize: 0,
                cornerRadius: 8,
                bodyFont: { family: 'Inter' },
                titleFont: { family: 'Outfit', weight: 'bold' }
            }
        },
        interaction: { intersect: false, mode: 'index' }
    };

    const linearScales = {
        x: { 
            grid: { display: false }, 
            ticks: { color: '#94a3b8', font: { family: 'Inter' } } 
        },
        y: { 
            grid: { color: 'rgba(255,255,255,0.03)' }, 
            ticks: { color: '#94a3b8', font: { family: 'Inter' } } 
        }
    };

    // Category Chart (Radar)
    charts.category = new Chart(document.getElementById('categoryChart'), {
        type: 'radar',
        data: {
            labels: [],
            datasets: [{
                label: 'Tickets',
                data: [],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#3b82f6'
            }]
        },
        options: {
            ...baseOptions,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255,255,255,0.05)' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    pointLabels: { color: '#94a3b8', font: { size: 10 } },
                    ticks: { display: false }
                }
            },
            plugins: { ...baseOptions.plugins, legend: { display: false } }
        }
    });

    // Volume Chart
    charts.volume = new Chart(document.getElementById('volumeChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Tickets',
                data: [],
                borderColor: '#00ccff',
                borderWidth: 4,
                pointBackgroundColor: '#00ccff',
                pointBorderColor: '#fff',
                pointHoverRadius: 6,
                tension: 0.45,
                fill: true,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(0, 242, 254, 0.4)');
                    gradient.addColorStop(1, 'rgba(122, 102, 255, 0)');
                    return gradient;
                }
            }]
        },
        options: {
            ...baseOptions,
            scales: linearScales
        }
    });

    // Resolution Origin Chart (Polar Area)
    charts.resolution = new Chart(document.getElementById('resolutionChart'), {
        type: 'polarArea',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.6)', 
                    'rgba(16, 185, 129, 0.6)', 
                    'rgba(251, 191, 36, 0.6)', 
                    'rgba(244, 63, 94, 0.6)'
                ],
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1
            }]
        },
        options: {
            ...baseOptions,
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { display: false }
                }
            },
            plugins: {
                ...baseOptions.plugins,
                legend: { 
                    position: 'right', 
                    labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true } 
                }
            }
        }
    });

    // Subcategory Chart (Vertical Bar)
    charts.subcategory = new Chart(document.getElementById('subcategoryChart'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Tickets',
                data: [],
                backgroundColor: 'rgba(168, 85, 247, 0.5)',
                borderRadius: 4
            }]
        },
        options: {
            ...baseOptions,
            scales: linearScales,
            plugins: { ...baseOptions.plugins, legend: { display: false } }
        }
    });

    // Initialize Sparklines
    sparklines.open = createSparkline('sparkline-open', '#3b82f6');
    sparklines.response = createSparkline('sparkline-response', '#a855f7');
    sparklines.csat = createSparkline('sparkline-csat', '#3b82f6');
    sparklines.sla = createSparkline('sparkline-sla', '#a855f7');

    // Root Cause Chart (Horizontal Bar)
    charts.rootCause = new Chart(document.getElementById('rootCauseChart'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Ticket Count',
                data: [],
                backgroundColor: '#3b82f6',
                borderRadius: 8,
                barThickness: 20
            }]
        },
        options: {
            ...baseOptions,
            indexAxis: 'y',
            scales: {
                y: { 
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Inter' } }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94a3b8', font: { family: 'Inter' }, stepSize: 1 }
                }
            }
        }
    });

    // Performance Trend Chart (Dual-Line with Area)
    charts.performanceTrend = new Chart(document.getElementById('performanceTrendChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'AI Confidence Score',
                    data: [],
                    borderColor: '#10b981',
                    borderWidth: 3,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: (ctx) => {
                        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                        return gradient;
                    }
                },
                {
                    label: 'SLA Compliance %',
                    data: [],
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            ...baseOptions,
            scales: linearScales,
            plugins: {
                ...baseOptions.plugins,
                legend: { display: true, position: 'top', align: 'end', labels: { color: '#94a3b8', font: { size: 10 } } }
            }
        }
    });

    // Impact Bubble Chart
    charts.impact = new Chart(document.getElementById('impactBubbleChart'), {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Subcategory Impact',
                data: [],
                backgroundColor: 'rgba(236, 72, 153, 0.5)',
                borderColor: '#ec4899',
                borderWidth: 1
            }]
        },
        options: {
            ...baseOptions,
            scales: {
                x: { 
                    title: { display: true, text: 'Cluster ID', color: '#64748b', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#64748b' }
                },
                y: { 
                    title: { display: true, text: 'Volume', color: '#64748b', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#64748b' }
                }
            },
            plugins: {
                ...baseOptions.plugins,
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const item = ctx.raw;
                            if (!item) return '';
                            return `${item.label || 'Segment'}: Volume ${item.y}, Impact ${item.r.toFixed(1)}`;
                        }
                    }
                }
            }
        }
    });
}

async function refreshData() {
    try {
        console.log('[v2.0] refreshData() starting...');
        const [stats, tickets] = await Promise.all([
            fetch(`${API_URL}/stats`).then(r => r.json()),
            fetch(`${API_URL}/tickets`).then(r => r.json())
        ]);

        console.log(`[v2.0] Fetched ${tickets.length} tickets from API.`);
        currentTickets = tickets; 
        updateCharts(stats);
        updateTicketTable(tickets);
    } catch (err) {
        console.error('Failed to refresh data:', err);
    }
}

function updateCharts(stats) {
    if (charts.volume) {
        charts.volume.data.labels = stats.volume.map(v => v.label);
        charts.volume.data.datasets[0].data = stats.volume.map(v => v.count);
        charts.volume.update();
    }

    if (charts.category) {
        charts.category.data.labels = stats.categories.map(c => c.label);
        charts.category.data.datasets[0].data = stats.categories.map(c => c.count);
        charts.category.update();
    }

    if (charts.rootCause) {
        charts.rootCause.data.labels = stats.rootCauses.map(r => r.label);
        charts.rootCause.data.datasets[0].data = stats.rootCauses.map(r => r.count);
        charts.rootCause.update();
    }

    if (stats.metrics) {
        document.getElementById('metric-total-open').innerText = stats.metrics.totalOpen.toLocaleString();
        document.getElementById('metric-avg-response').innerText = stats.metrics.avgResponseTime;
        document.getElementById('metric-csat').innerText = `CSAT ${stats.metrics.csat}/5`;
        document.getElementById('metric-sla').innerText = `${stats.metrics.slaCompliance}%`;
        
        const stars = '★'.repeat(Math.round(stats.metrics.csat)) + '☆'.repeat(5 - Math.round(stats.metrics.csat));
        const starsElement = document.querySelector('.metric-stars');
        if (starsElement) starsElement.innerText = stars;

        if (charts.resolution) {
            charts.resolution.data.labels = stats.resolutions.map(r => r.label);
            charts.resolution.data.datasets[0].data = stats.resolutions.map(r => r.count);
            charts.resolution.update();
        }

        if (charts.subcategory) {
            charts.subcategory.data.labels = stats.subcategories.map(s => s.label);
            charts.subcategory.data.datasets[0].data = stats.subcategories.map(s => s.count);
            charts.subcategory.update();
        }

        if (charts.performanceTrend) {
            charts.performanceTrend.data.labels = stats.sentimentTrend.map(t => t.label);
            charts.performanceTrend.data.datasets[0].data = stats.sentimentTrend.map(t => parseFloat(t.count));
            charts.performanceTrend.data.datasets[1].data = stats.slaTrend.map(t => parseFloat(t.count));
            charts.performanceTrend.update();
        }

        if (charts.impact) {
            charts.impact.data.datasets[0].data = stats.impactMap;
            charts.impact.update();
        }

        if (stats.sparklines) {
            Object.keys(sparklines).forEach(key => {
                if (stats.sparklines[key]) {
                    sparklines[key].data.datasets[0].data = stats.sparklines[key];
                    sparklines[key].update('none'); 
                }
            });
        }
    }
}

function updateTicketTable(tickets) {
    const tbody = document.getElementById('ticket-table-body');
    const searchInput = document.getElementById('ticket-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Apply Search Filter
    const displayTickets = query ? tickets.filter(t => {
        const matches = (t.problem_summary || '').toLowerCase().includes(query) ||
                      (t.company_name || '').toLowerCase().includes(query) ||
                      (t.issue_category || '').toLowerCase().includes(query);
        return matches;
    }) : tickets;

    if (displayTickets.length === 0 && query !== '') {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px; color: #64748b;">No tickets found matching "${query}"</td></tr>`;
        return;
    }

    tbody.innerHTML = displayTickets.map(t => {
        const customerName = t.company_name || 'Organization';
        const assignedAgent = 'Support Intel';
        const category = t.issue_category || 'Other';
        const severity = (t.severity || 'Medium').toLowerCase();
        const status = t.status || 'analyzed';
        const displayStatus = (status.replace('_', ' '));
        
        const catColors = { 
            'Authentication': '#3b82f6', 
            'Performance': '#a855f7', 
            'Bug': '#f43f5e', 
            'Billing': '#10b981',
            'Other': '#64748b'
        };
        const catColor = catColors[category] || catColors['Other'];

        // Apply highlighting
        const displayProb = highlight(t.problem_summary?.substring(0, 100), query) + (t.problem_summary?.length > 100 ? '...' : '');
        const displayComp = highlight(customerName, query);
        const displayCat = highlight(category, query);

        return `
            <tr onclick="showTicketDetails(${t.id})">
                <td class="ticket-id">#${t.id}</td>
                <td title="${t.problem_summary}">${displayProb}</td>
                <td>
                    <div class="user-cell">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(customerName)}&background=1c222d&color=8b949e" alt="">
                        ${displayComp}
                    </div>
                </td>
                <td>
                    <div class="user-cell">
                        <div class="cat-icon" style="background: ${catColor}">${category.substring(0, 2).toUpperCase()}</div>
                        ${displayCat}
                    </div>
                </td>
                <td><span class="status-badge status-${severity}">${severity}</span></td>
                <td><span class="status-pill status-${status}">${displayStatus}</span></td>
                <td>
                    <div class="user-cell">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(assignedAgent)}&background=6366f1&color=fff" alt="">
                        <div class="agent-info">
                            <span class="agent-name">${assignedAgent}</span>
                            <span class="conf-score">Conf: ${t.confidence_score}/10</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display: flex; justify-content: flex-end;">
                        <button class="btn-delete" onclick="event.stopPropagation(); deleteTicket(${t.id})" title="Delete Ticket">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function deleteTicket(id) {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;

    try {
        const response = await fetch(`${API_URL}/tickets/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Ticket deleted successfully');
            refreshData(); // Refresh the list
        } else {
            console.error('Delete failed');
            showToast('Failed to delete ticket', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Error deleting ticket', 'error');
    }
}

function showTicketDetails(id) {
    const ticket = currentTickets.find(t => t.id === id);
    if (!ticket) return;

    document.getElementById('detail-id').innerText = `#${ticket.id}`;
    document.getElementById('detail-company').innerText = ticket.company_name || 'Organization';
    document.getElementById('detail-problem').innerText = ticket.problem_summary;
    document.getElementById('detail-solution').innerText = ticket.solution_summary || 'No solution recorded yet.';
    
    document.getElementById('detail-root-cause').innerText = ticket.root_cause || 'Analyzing...';
    document.getElementById('detail-suggested-action').innerText = ticket.suggested_action || 'Pending Review';
    
    document.getElementById('detail-category').innerText = ticket.issue_category || 'Other';
    document.getElementById('detail-confidence').innerText = `${ticket.confidence_score}/10`;
    document.getElementById('detail-churn').innerText = (ticket.churn_risk || 'No').toUpperCase();
    document.getElementById('detail-upsell').innerText = (ticket.upsell_opportunity || 'No').toUpperCase();
    document.getElementById('detail-area').innerText = ticket.product_area || 'Universal';
    document.getElementById('detail-resolution-type').innerText = ticket.resolution_type || 'Unknown';
    
    // Enriched Data Rendering
    const stakeholders = typeof ticket.stakeholders === 'string' ? JSON.parse(ticket.stakeholders || '[]') : (ticket.stakeholders || []);
    const deviceIds = typeof ticket.device_ids === 'string' ? JSON.parse(ticket.device_ids || '[]') : (ticket.device_ids || []);

    document.getElementById('detail-stakeholders').innerHTML = stakeholders.length > 0 
        ? stakeholders.map(s => `<div class="stakeholder-pill"><span>👤 ${s.name}</span><span class="role">${s.role}</span></div>`).join('')
        : '<span style="color: var(--text-secondary); font-size: 13px;">No stakeholders identified</span>';

    document.getElementById('detail-devices').innerHTML = deviceIds.length > 0 
        ? deviceIds.map(d => `<div class="device-tag">📟 ${d}</div>`).join('')
        : '<span style="color: var(--text-secondary); font-size: 13px;">No hardware IDs detected</span>';

    const reasoning = ticket.reasoning || 'Technical reasoning not available for this legacy ticket.';
    document.getElementById('detail-reasoning').innerText = reasoning;

    // Load AI Suggested KB Articles
    loadKBSuggestions(id);

    // Show/Hide Review Actions
    const reviewActions = document.getElementById('review-actions');
    if (ticket.status === 'pending_review') {
        reviewActions.style.display = 'block';
        reviewActions.dataset.currentId = id; // Store for approval
    } else {
        reviewActions.style.display = 'none';
    }

    const severity = (ticket.severity || 'Medium').toLowerCase();
    const sevBadge = document.getElementById('detail-severity');
    sevBadge.innerText = severity;
    sevBadge.className = `status-badge status-${severity}`;

    document.getElementById('ticket-details-modal').classList.add('active');
    document.body.classList.add('no-scroll');
}

async function handleApprove() {
    const id = document.getElementById('review-actions').dataset.currentId;
    const btn = document.getElementById('approve-btn');
    const toast = document.getElementById('toast');

    btn.disabled = true;
    btn.innerText = 'Syncing to Zendesk...';

    try {
        const res = await fetch(`${API_URL}/tickets/${id}/approve`, { method: 'PATCH' });
        if (res.ok) {
            toast.textContent = 'Ticket Synced to Zendesk!';
            toast.style.display = 'block';
            document.getElementById('ticket-details-modal').classList.remove('active');
            await refreshData();
        }
    } catch (err) {
        console.error('Approval failed:', err);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Approve & Sync to Zendesk';
        setTimeout(() => toast.style.display = 'none', 3000);
    }
}

async function handleTicketSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-ticket-btn');
    const toast = document.getElementById('toast');
    
    // UI Loading State
    submitBtn.disabled = true;
    submitBtn.innerText = 'Analyzing Patterns...';
    toast.style.display = 'block';
    
    const data = {
        customer_email: document.getElementById('customer_email').value,
        problem: document.getElementById('problem').value,
        solution: document.getElementById('solution').value || "No preliminary solution provided."
    };

    try {
        const res = await fetch(`${API_URL}/tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            toast.textContent = 'Intelligence Extracted Successfully!';
            document.getElementById('ticket-form').reset();
            document.getElementById('modal').classList.remove('active');
            await refreshData();
        } else {
            toast.textContent = 'Error: Pattern analysis failed.';
        }
    } catch (err) {
        toast.textContent = 'Connection Error: Backend offline.';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Process with Intelligence';
    }

    setTimeout(() => {
        toast.style.display = 'none';
        toast.textContent = 'Processing ticket...';
    }, 3000);
}

/**
 * MAGIC REPAIR: Attempts to recover a valid JSON object/array from messy, escaped, 
 * or partially broken text strings typical of AI/Console outputs.
 */
function repairJSON(str) {
    if (!str) return null;
    let clean = str.trim();

    // 1. Decode HTML Entities (common in ticket exports)
    const textArea = document.createElement('textarea');
    textArea.innerHTML = clean;
    clean = textArea.value;

    // 2. Remove Markdown code blocks
    clean = clean.replace(/^```(json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // 3. Check for valid JSON directly or via unescaping
    let processed = clean;
    for (let i = 0; i < 3; i++) {
        try {
            const firstChar = processed.trim()[0];
            if (firstChar === '{' || firstChar === '[') {
                return JSON.parse(processed);
            }
        } catch (e) {}

        try {
            // Attempt to parse as a string first (handles double-stringified input)
            const parsed = JSON.parse(processed);
            if (parsed && typeof parsed === 'object') return parsed;
            if (typeof parsed === 'string') {
                processed = parsed;
                continue;
            }
        } catch (e) {}

        // Remove wrap-quotes if they exist
        if (processed.startsWith('"') && processed.endsWith('"')) {
            processed = processed.slice(1, -1);
        }
        
        // Perform unescaping
        const unescaped = processed
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t');
        
        if (unescaped === processed) break;
        processed = unescaped;
    }

    // 4. Boundary extraction (Final structure check)
    const firstBrace = processed.indexOf('{');
    const lastBrace = processed.lastIndexOf('}');
    const firstBracket = processed.indexOf('[');
    const lastBracket = processed.lastIndexOf(']');
    
    let start = -1, end = -1;
    if (firstBrace !== -1 && (firstBracket === -1 || (firstBrace < firstBracket && firstBrace !== -1))) {
        start = firstBrace; end = lastBrace;
    } else if (firstBracket !== -1) {
        start = firstBracket; end = lastBracket;
    }

    if (start !== -1 && end !== -1) {
        const potentialJson = processed.substring(start, end + 1);
        try {
            return JSON.parse(potentialJson);
        } catch (e) {
            // Key repair for unquoted JSON-ish text
            const fixedKeys = potentialJson.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
            try { return JSON.parse(fixedKeys); } catch (inner) {}
        }
    }

    // 5. TEXT FALLBACK: If it doesn't look like JSON structure, treat as one raw ticket
    // This handles broken snippets or random text pastes.
    if (processed.length > 5) {
        console.log("JSON structure not found or broken. Falling back to raw text mode.");
        return {
            problem: processed.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n'),
            customer_email: processed.match(/\S+@\S+\.\S+/) ? processed.match(/\S+@\S+\.\S+/)[0] : 'unknown@customer.com'
        };
    }

    throw new Error("Deep JSON repair failed");
}

// Bulk Import Logic
function showImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('no-scroll');
    }
}

function closeImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
}

function closeDetailsModal() {
    const modal = document.getElementById('ticket-details-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
}

function closeMainModal() {
    const modal = document.getElementById('ticket-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
}

function switchImportTab(tab) {
    const tabs = document.querySelectorAll('.import-tab');
    const sections = document.querySelectorAll('.import-section');

    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));

    if (tab === 'paste') {
        tabs[0].classList.add('active');
        document.getElementById('import-paste-area').classList.add('active');
    } else {
        tabs[1].classList.add('active');
        document.getElementById('import-upload-area').classList.add('active');
    }
}

// File Upload Handling
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

if (dropZone) {
    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleBulkFile(e.dataTransfer.files[0]);
    };
}

if (fileInput) {
    fileInput.onchange = (e) => handleBulkFile(e.target.files[0]);
}

function handleBulkFile(file) {
    if (!file || !file.name.endsWith('.json')) {
        alert('Please upload a valid .json file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            document.getElementById('bulk-json-input').value = JSON.stringify(data, null, 2);
            switchImportTab('paste');
        } catch (err) {
            alert('Invalid JSON in file');
        }
    };
    reader.readAsText(file);
}

async function submitBulkImport() {
    const jsonText = document.getElementById('bulk-json-input').value;
    let data;

    try {
        data = repairJSON(jsonText);
        // Ensure it's an array for the backend
        if (!Array.isArray(data)) data = [data];
    } catch (err) {
        alert('Could not parse JSON. Ensure you pasted a valid JSON object or array.');
        return;
    }

    const progressArea = document.getElementById('bulk-import-progress');
    const progressFill = document.getElementById('bulk-progress-fill');
    const statusText = document.getElementById('bulk-status-text');
    const submitBtn = document.getElementById('btn-submit-bulk');

    progressArea.style.display = 'block';
    progressFill.style.width = '10%';
    statusText.innerText = `Connecting to analysis engine for ${data.length} items...`;
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/tickets/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        progressFill.style.width = '100%';
        statusText.innerText = `Successfully processed ${result.processed} tickets.`;

        setTimeout(() => {
            closeImportModal();
            progressArea.style.display = 'none';
            submitBtn.disabled = false;
            document.getElementById('bulk-json-input').value = '';
            refreshData();
            showToast(`Bulk Import Complete: ${result.processed} tickets added.`);
        }, 1500);

    } catch (err) {
        console.error('Bulk Import Error:', err);
        statusText.innerText = 'Network error during processing.';
        submitBtn.disabled = false;
    }
}

async function fetchKB() {
    try {
        const response = await fetch(`${API_URL}/kb`);
        const articles = await response.json();
        renderKB(articles);
    } catch (error) {
        console.error('KB Fetch Error:', error);
    }
}

function renderKB(articles, query = '') {
    const container = document.getElementById('kb-grid-container');
    if (!container) return;

    if (articles.length === 0) {
        container.innerHTML = `<div class="placeholder-content"><h4>No articles found for "${query}".</h4></div>`;
        return;
    }

    container.innerHTML = articles.map(art => `
        <div class="chart-card kb-item article-card" onclick="showKBArticle(${art.id})">
            <div class="kb-article-cat">${highlight(art.category, query)}</div>
            <h4 class="kb-article-title">${highlight(art.title, query)}</h4>
            <div class="kb-article-tags" style="margin-bottom: 8px;">
                ${art.tags.split(',').map(tag => `<span class="tag-pill">${highlight(tag.trim(), query)}</span>`).join('')}
            </div>
            <p class="kb-article-snippet">${highlight(art.content.substring(0, 100), query)}...</p>
        </div>
    `).join('');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

async function showKBArticle(id) {
    try {
        const response = await fetch(`${API_URL}/kb/${id}`);
        if (!response.ok) throw new Error('Article fetch failed');
        const art = await response.json();
        
        if (art) {
            document.getElementById('kb-modal-cat').innerText = art.category;
            document.getElementById('kb-modal-title').innerText = art.title;
            document.getElementById('kb-modal-tags').innerHTML = art.tags.split(',')
                .map(tag => `<span class="tag-pill">${tag.trim()}</span>`).join('');
            
            // Advanced formatting: Bold, Line Breaks, and Lists
            let clean = art.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                .replace(/\n\n/g, '</p><p>');               // Paragraphs

            // Handle Numbered Lists (1. Item)
            if (clean.match(/\d+\.\s/)) {
                clean = clean.replace(/(\d+\.\s.*?)(\n|$)/g, '<li>$1</li>');
                clean = clean.replace(/(<li>.*?<\/li>)+/g, '<ol>$&</ol>');
            }

            // Handle Bullet Lists (- Item)
            if (clean.match(/\n-\s/)) {
                clean = clean.replace(/\n-\s/g, '</li><li>');
                clean = '<ul><li>' + clean + '</li></ul>';
            }
            
            document.getElementById('kb-modal-content').innerHTML = `<p>${clean}</p>`;
            document.getElementById('kb-article-modal').classList.add('active');
            document.body.classList.add('no-scroll');
        }
    } catch (e) {
        console.error('Show KB Article Error:', e);
        showToast('Error opening article');
    }
}

function closeKBModal() {
    document.getElementById('kb-article-modal').classList.remove('active');
    document.body.classList.remove('no-scroll');
}

function copyArticleToClipboard() {
    const title = document.getElementById('kb-modal-title').innerText;
    const content = document.getElementById('kb-modal-content').innerText;
    const fullText = `SOLUTION: ${title}\n\n${content}`;
    
    navigator.clipboard.writeText(fullText).then(() => {
        showToast('Solution copied to clipboard!');
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

async function loadKBSuggestions(ticketId) {
    const container = document.getElementById('detail-suggestions');
    if (!container) return;
    
    container.innerHTML = '<span class="loading-inline">Finding solutions...</span>';
    
    try {
        const response = await fetch(`${API_URL}/kb/suggest?ticket_id=${ticketId}`);
        const suggestions = await response.json();
        
        if (suggestions.length === 0) {
            container.innerHTML = '<span class="no-suggest">No relevant articles found.</span>';
            return;
        }

        container.innerHTML = suggestions.map(s => `
            <div class="suggestion-pill" onclick="showKBArticle(${s.id})">
                <span class="icon">📖</span> ${s.title}
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<span class="no-suggest">Error loading suggestions.</span>';
    }
}

async function fetchReports() {
    try {
        const response = await fetch(`${API_URL}/reports/stats`);
        const data = await response.json();
        renderReports(data);
    } catch (error) {
        console.error('Fetch Reports Error:', error);
    }
}

function renderReports(data) {
    // 1. AI Confidence Trend Chart
    const confidenceCtx = document.getElementById('confidence-trend-chart')?.getContext('2d');
    if (confidenceCtx && data.confidenceTrends) {
        if (charts.confidenceTrend) charts.confidenceTrend.destroy();
        charts.confidenceTrend = new Chart(confidenceCtx, {
            type: 'line',
            data: {
                labels: data.confidenceTrends.map((_, i) => `T-${data.confidenceTrends.length-i}`),
                datasets: [{
                    label: 'Confidence Score',
                    data: data.confidenceTrends.map(t => t.confidence_score),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 10, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // 2. Status Distribution Chart
    const statusCtx = document.getElementById('status-distribution-chart')?.getContext('2d');
    if (statusCtx && data.statusStats) {
        if (charts.statusDist) charts.statusDist.destroy();
        charts.statusDist = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: data.statusStats.map(s => s.status),
                datasets: [{
                    data: data.statusStats.map(s => s.count),
                    backgroundColor: ['#34d399', '#fbbf24', '#ef4444', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { position: 'right' } }
            }
        });
    }

    // 3. Category Distribution Chart
    const categoryCtx = document.getElementById('category-distribution-chart')?.getContext('2d');
    if (categoryCtx && data.categoryStats) {
        if (charts.categoryDist) charts.categoryDist.destroy();
        charts.categoryDist = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: data.categoryStats.map(c => c.issue_category),
                datasets: [{
                    label: 'Tickets',
                    data: data.categoryStats.map(c => c.count),
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // 4. Top Customers List
    const customerList = document.getElementById('top-customers-list');
    if (customerList && data.topCustomers) {
        customerList.innerHTML = data.topCustomers.map(c => `
            <div class="report-list-item">
                <span class="customer-name">${c.company_name}</span>
                <span class="ticket-count">${c.count} tickets</span>
            </div>
        `).join('');
    }
}

async function fetchAccountPulse() {
    const grid = document.getElementById('accounts-grid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/accounts/pulse`);
        const data = await res.json();
        renderAccounts(data);
    } catch (err) {
        console.error('Failed to fetch account pulse:', err);
        grid.innerHTML = `<div class="placeholder-content"><h4>Failed to load account data</h4></div>`;
    }
}

function renderAccounts(data) {
    const grid = document.getElementById('accounts-grid');
    const globalIndicator = document.getElementById('global-health-indicator');
    if (!grid) return;

    if (!data || data.length === 0) {
        grid.innerHTML = `<div class="placeholder-content"><h4>No account data available</h4></div>`;
        return;
    }

    // Update Global Indicator
    const avgScore = data.reduce((acc, curr) => acc + curr.health_score, 0) / data.length;
    if (globalIndicator) {
        if (avgScore > 80) {
            globalIndicator.innerText = 'Stable';
            globalIndicator.style.background = 'rgba(16, 185, 129, 0.1)';
            globalIndicator.style.color = '#10b981';
        } else if (avgScore > 50) {
            globalIndicator.innerText = 'Under Pressure';
            globalIndicator.style.background = 'rgba(251, 191, 36, 0.1)';
            globalIndicator.style.color = '#fbbf24';
        } else {
            globalIndicator.innerText = 'Critical';
            globalIndicator.style.background = 'rgba(244, 63, 94, 0.1)';
            globalIndicator.style.color = '#f43f5e';
        }
    }

    grid.innerHTML = data.sort((a, b) => a.health_score - b.health_score).map(acc => {
        const scoreColor = acc.health_score > 80 ? '#10b981' : acc.health_score > 50 ? '#fbbf24' : '#f43f5e';
        
        return `
            <div class="account-card" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border); border-radius: 16px; padding: 24px; transition: all 0.3s ease; position: relative; overflow: hidden;">
                <div class="health-bar" style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${scoreColor};"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div>
                        <h4 style="margin: 0; font-size: 18px;">${acc.company_name}</h4>
                        <span style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Account Status</span>
                    </div>
                    <span class="status-badge" style="background: ${scoreColor}15; color: ${scoreColor}; border: 1px solid ${scoreColor}30; font-size: 10px; padding: 4px 10px; border-radius: 6px;">${acc.status}</span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 10px;">
                        <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">Total Tickets</label>
                        <span style="font-size: 16px; font-weight: 600;">${acc.total_tickets}</span>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 10px;">
                        <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">Open Cases</label>
                        <span style="font-size: 16px; font-weight: 600; color: ${acc.open_tickets > 0 ? '#fbbf24' : 'inherit'}">${acc.open_tickets}</span>
                    </div>
                </div>


                <button class="secondary small" style="width: 100%; margin-top: 20px; font-size: 12px; cursor: pointer;" onclick="showAccountDetails('${acc.company_name}')">View Intelligence Deep-Dive</button>
            </div>
        `;
    }).join('');
}

function showAccountDetails(company) {
    const modal = document.getElementById('account-detail-modal');
    const tbody = document.getElementById('account-ticket-table-body');
    const title = document.getElementById('account-modal-title');
    const subtitle = document.getElementById('account-modal-subtitle');
    
    if (!modal || !tbody) return;

    title.innerText = `${company} Intelligence`;
    const filtered = currentTickets.filter(t => (t.company_name || '').toLowerCase() === company.toLowerCase());
    subtitle.innerText = `${filtered.length} total cases detected for this account.`;

    tbody.innerHTML = filtered.map(t => {
        const severity = (t.severity || 'Medium').toLowerCase();
        const status = (t.status || 'analyzed').replace('_', ' ');
        
        return `
            <tr>
                <td class="ticket-id">#${t.id}</td>
                <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.problem_summary}">
                    ${t.problem_summary}
                </td>
                <td><span class="status-badge status-${severity}">${severity}</span></td>
                <td><span class="status-pill status-${t.status}">${status}</span></td>
                <td>
                    <button class="primary small" onclick="closeAccountDetailModal(); showTicketDetails(${t.id})">Inspect</button>
                </td>
            </tr>
        `;
    }).join('');

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-secondary);">No tickets found for this account.</td></tr>`;
    }

    modal.classList.add('active');
    document.body.classList.add('no-scroll');
}

function closeAccountDetailModal() {
    const modal = document.getElementById('account-detail-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('no-scroll');
    }
}

function filterTicketsByCompany(company) {
    const searchInput = document.getElementById('ticket-search');
    if (searchInput) {
        searchInput.value = company;
        showPage('tickets');
        updateTicketTable(currentTickets);
    }
}
