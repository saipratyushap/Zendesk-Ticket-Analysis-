import os
import json
import math
import random
from pathlib import Path
from datetime import datetime, timedelta
from typing import Any, Dict, List, cast
from flask import Flask, request, jsonify, send_from_directory  # pyre-ignore[21]
from flask_cors import CORS  # pyre-ignore[21]
from dotenv import load_dotenv  # pyre-ignore[21]

load_dotenv(dotenv_path=Path(__file__).parent / '.env')

from db import init_db, check_connection, ensure_kb_articles, insert_ticket, query, migrate_ticket_statuses  # pyre-ignore[21]
from ai import process_ticket, extract_text, force_taxonomy_match  # pyre-ignore[21]

app = Flask(__name__, static_folder=str(Path(__file__).parent.parent / 'frontend-react' / 'dist'))
CORS(app)

PORT = int(os.environ.get('PORT', 5001))
DB_TYPE = os.environ.get('DB_TYPE', 'sqlite')


def ph():
    """Return the correct placeholder for the current DB type."""
    return '%s' if DB_TYPE == 'mysql' else '?'


# ─── Serve React SPA ─────────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    dist = Path(__file__).parent.parent / 'frontend-react' / 'dist'
    if path and (dist / path).exists():
        return send_from_directory(str(dist), path)
    return send_from_directory(str(dist), 'index.html')


# ─── Tickets ─────────────────────────────────────────────────────────────────

@app.route('/api/tickets', methods=['POST'])
def create_ticket():
    data = request.get_json() or {}
    problem = data.get('problem')
    solution = data.get('solution')
    customer_email = data.get('customer_email', 'anon@example.com')

    if not problem or not solution:
        return jsonify({'error': 'Problem and solution are required'}), 400

    try:
        print(f'Processing ticket for: {customer_email}')
        ai_data = process_ticket(problem, solution, customer_email)
        result = insert_ticket(ai_data)
        return jsonify({'id': result['insertId'], **ai_data}), 201
    except Exception as e:
        print(f'Error processing ticket: {e}')
        return jsonify({'error': 'Failed to process ticket'}), 500


@app.route('/api/tickets/close', methods=['POST'])
def close_ticket_api():
    """
    Simulates a real-world external system (like Zendesk) closing a ticket 
    and sending the final state to our intelligence engine via API.
    """
    data = request.get_json() or {}
    ticket_id = data.get('ticket_id')
    title = data.get('title', 'Unknown Ticket')
    description = data.get('description', '')
    
    if not description:
        return jsonify({'error': 'Ticket description is required for analysis'}), 400
        
    try:
        print(f"--- SIMULATION START: Processing External Ticket {ticket_id or ''} ---")
        
        # 1. Immediate AI Intelligence Sweep
        # We pass title and description to the analyzer
        ai_result = process_ticket(title, description, 'simulated-external-system@factbird.com')
        
        # 2. Enrich with Simulation metadata
        # If confidence is low (<70%), we keep it in 'pending_review' for visibility.
        # Otherwise, we auto-sync it as a high-quality result.
        confidence = int(ai_result.get('confidence_score', 0))
        if confidence >= 70:
            ai_result['status'] = 'synced'
            print(f"--- HIGH CONFIDENCE ({confidence}%): Auto-synced ---")
        else:
            ai_result['status'] = 'pending_review'
            print(f"--- LOW CONFIDENCE ({confidence}%): Routed to Pending Review ---")
            
        ai_result['processed_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # 3. Persist to Database
        # This proves the "Database View" works for externally injected data
        db_result = insert_ticket(ai_result)
        final_id = db_result.get('insertId') or ticket_id
        
        print(f"--- SIMULATION COMPLETE: Ticket #{final_id} Persisted with AI Insights ---")
        
        return jsonify({
            'status': 'success',
            'message': 'External ticket analyzed and persisted successfully',
            'ticket_id': final_id,
            'ai_insights': {
                'problem': ai_result.get('problem_summary'),
                'confidence': ai_result.get('confidence_score')
            }
        }), 201
    except Exception as e:
        print(f"Simulation API Error: {e}")
        return jsonify({'error': 'Backend processing failed during simulation'}), 500
@app.route('/api/process-email', methods=['POST'])
def process_email_api():
    """
    Direct endpoint for processing specialized email JSON payloads.
    Used for local testing and simulation of email-to-ticket ingestion.
    """
    data = request.get_json() or {}
    try:
        print("--- Processing Custom Email Payload ---")
        # process_ticket correctly handles the 'output' dictionary structure
        ai_result = process_ticket(data, '', 'test-email@factbird.com')
        
        # Determine status based on confidence
        confidence = int(ai_result.get('confidence_score', 0))
        ai_result['status'] = 'synced' if confidence >= 70 else 'pending_review'
        ai_result['processed_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Persist to DB so it appears in the dashboard
        insert_ticket(ai_result)
        
        return jsonify({
            'status': 'success',
            'ai_insights': {
                'confidence': ai_result.get('confidence_score'),
                'problem': ai_result.get('problem_summary'),
                'strategy': ai_result.get('solution_summary')
            }
        }), 201
    except Exception as e:
        print(f"Email API Error: {e}")
        return jsonify({'error': str(e)}), 500



@app.route('/api/tickets', methods=['GET'])
def get_tickets():
    try:
        tickets = query('SELECT * FROM tickets ORDER BY created_at DESC')
        return jsonify(tickets)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch tickets'}), 500


@app.route('/api/tickets', methods=['DELETE'])
def clear_tickets():
    try:
        query('DELETE FROM tickets')
        if DB_TYPE == 'sqlite':
            try:
                query("DELETE FROM sqlite_sequence WHERE name='tickets'")
            except Exception:
                pass
        return jsonify({'message': 'All tickets cleared successfully'})
    except Exception as e:
        print(f'Clear all error: {e}')
        return jsonify({'error': 'Failed to clear tickets'}), 500


@app.route('/api/tickets/<int:ticket_id>', methods=['DELETE'])
def delete_ticket(ticket_id):
    try:
        query(f'DELETE FROM tickets WHERE id = {ph()}', [ticket_id])
        return jsonify({'message': 'Ticket deleted successfully'})
    except Exception as e:
        print(f'Delete error: {e}')
        return jsonify({'error': 'Failed to delete ticket'}), 500


@app.route('/api/tickets/<int:ticket_id>/approve', methods=['PATCH'])
def approve_ticket(ticket_id):
    try:
        print(f'Approving and syncing ticket #{ticket_id} to Zendesk...')
        query(f"UPDATE tickets SET status = 'synced' WHERE id = {ph()}", [ticket_id])
        return jsonify({'message': 'Ticket approved and synced successfully'})
    except Exception as e:
        print(f'Approval error: {e}')
        return jsonify({'error': 'Failed to approve ticket'}), 500


@app.route('/api/database-view', methods=['GET'])
def get_database_view():
    try:
        # Fetch all rows for transparency, ordering by processed status and then creation date
        tickets = query('SELECT * FROM tickets ORDER BY processed_at DESC, created_at DESC')
        return jsonify(tickets)
    except Exception as e:
        print(f'Database View Error: {e}')
        return jsonify({'error': 'Failed to fetch database view'}), 500


# ─── Analysis ────────────────────────────────────────────────────────────────

@app.route('/api/analyze-all', methods=['POST'])
def analyze_all():
    body = request.get_json() or {}
    mode = body.get('mode', 'deep')
    try:
        print(f'Starting {mode} intelligence sweep for pending tickets...')
        pending = query(f"SELECT * FROM tickets WHERE status = 'open' OR status = 'pending'")
        if not pending:
            return jsonify({'message': 'No pending tickets to analyze', 'processed': 0})

        processed: int = 0
        for ticket in pending:
            try:
                ai_data = process_ticket(ticket['problem_summary'], '', ticket.get('customer_email', 'anon@factbird.com'), mode)
                
                # Update ticket with AI data AND set status to 'analyzed' to prevent re-processing
                ai_data['status'] = 'analyzed'
                ai_data['processed_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                set_clause = ', '.join(f'{k} = {ph()}' for k in ai_data.keys())
                values = list(ai_data.values()) + [ticket['id']]
                query(f'UPDATE tickets SET {set_clause} WHERE id = {ph()}', values)
                processed += 1  # pyre-ignore[6]
            except Exception as e:
                print(f"Failed to analyze ticket #{ticket['id']}: {e}")

        return jsonify({'message': 'Intelligence sweep complete', 'processed': processed})
    except Exception as e:
        print(f'Core analysis sweep failed: {e}')
        return jsonify({'error': 'Analysis engine failure'}), 500


@app.route('/api/reanalyze-all', methods=['POST'])
def reanalyze_all():
    body = request.get_json() or {}
    mode = body.get('mode', 'deep')
    try:
        print(f'Resetting all classified tickets for {mode} re-analysis...')
        query(f"UPDATE tickets SET status = 'pending' WHERE status != 'open' AND status != 'pending'")
        pending = query(f"SELECT * FROM tickets WHERE status = 'pending'")

        processed: int = 0
        for ticket in pending:
            try:
                ai_data = process_ticket(ticket['problem_summary'], ticket.get('solution_summary', ''), ticket.get('customer_email', 'anon@factbird.com'), mode)
                
                # Update ticket with AI data AND set status to 'analyzed' to prevent re-processing
                ai_data['status'] = 'analyzed'
                ai_data['processed_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                
                set_clause = ', '.join(f'{k} = {ph()}' for k in ai_data.keys())
                values = list(ai_data.values()) + [ticket['id']]
                query(f'UPDATE tickets SET {set_clause} WHERE id = {ph()}', values)
                processed += 1  # pyre-ignore[6]
            except Exception as e:
                print(f"Failed to re-analyze ticket #{ticket['id']}: {e}")

        return jsonify({'message': 'Re-analysis complete', 'processed': processed})
    except Exception as e:
        print(f'Re-analysis failed: {e}')
        return jsonify({'error': 'Failed to trigger re-analysis'}), 500


@app.route('/api/ai/consult', methods=['POST'])
def consult_ai():
    data = request.get_json() or {}
    problem = data.get('problem')
    solution = data.get('solution', '')
    mode = data.get('mode', 'deep')
    
    if not problem:
        return jsonify({'error': 'Problem context is required'}), 400
        
    try:
        print(f"Consulting AI for: {problem[:50]}...")
        ai_data = process_ticket(problem, solution, 'consultant@ai.desk', mode)
        return jsonify(ai_data)
    except Exception as e:
        print(f"Consultation error: {e}")
        return jsonify({'error': 'AI Desk is currently unavailable'}), 500


# ─── Stats ───────────────────────────────────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        # 1. Most Common Problems
        common_problems = query("""
            SELECT COALESCE(problem_summary, 'Unknown') as label, COUNT(*) as count 
            FROM tickets 
            WHERE problem_summary IS NOT NULL AND problem_summary != ''
            GROUP BY label ORDER BY count DESC LIMIT 10
        """)

        # 2. Most Common Root Causes
        common_root_causes = query("""
            SELECT COALESCE(root_cause, 'Unknown') as label, COUNT(*) as count 
            FROM tickets 
            WHERE root_cause IS NOT NULL AND root_cause != ''
            GROUP BY label ORDER BY count DESC LIMIT 10
        """)

        # 3. Most Common Solutions
        common_solutions = query("""
            SELECT COALESCE(solution_summary, 'Unknown') as label, COUNT(*) as count 
            FROM tickets 
            WHERE solution_summary IS NOT NULL AND solution_summary != ''
            GROUP BY label ORDER BY count DESC LIMIT 10
        """)

        # 4. Problem Distribution by Category — normalize old names → taxonomy, then merge duplicates
        raw_categories = query("""
            SELECT COALESCE(issue_category, 'Uncategorized') as label, COUNT(*) as count
            FROM tickets
            GROUP BY label ORDER BY count DESC
        """)
        _cat_map = {}
        for row in raw_categories:
            norm = force_taxonomy_match('issue_category', row['label'])
            _cat_map[norm] = _cat_map.get(norm, 0) + row['count']
        categories = sorted([{'label': k, 'count': v} for k, v in _cat_map.items()], key=lambda x: -x['count'])

        # 5. Top Impacting Accounts
        top_companies = query("""
            SELECT COALESCE(company_name, 'Individuals / Misc') as label, COUNT(*) as count 
            FROM tickets 
            GROUP BY label ORDER BY count DESC LIMIT 8
        """)

        # 6. AI Intelligence: Areas of Solution Distribution — same normalization + dedup
        raw_area_stats = query("""
            SELECT COALESCE(NULLIF(TRIM(issue_category), ''), 'Reliability & Performance (errors, outages, system performance, migration)') as label, COUNT(*) as count
            FROM tickets
            WHERE issue_category IS NOT NULL AND TRIM(issue_category) != ''
            GROUP BY label ORDER BY count DESC
        """)
        _area_map = {}
        for row in raw_area_stats:
            norm = force_taxonomy_match('issue_category', row['label'])
            _area_map[norm] = _area_map.get(norm, 0) + row['count']
        product_area_stats = sorted([{'label': k, 'count': v} for k, v in _area_map.items()], key=lambda x: -x['count'])
        # 7. Solutions vs Number of Times Provided
        resolution_type_stats = query("""
            SELECT COALESCE(resolution_type, 'Unknown') as label, COUNT(*) as count 
            FROM tickets 
            GROUP BY label ORDER BY count DESC
        """)
        print(f"DEBUG: Product Area Stats: {product_area_stats}")

        # Calculate KPIs for sparklines and cards
        total_rows = query('SELECT COUNT(*) as count FROM tickets')
        total: int = cast(Dict[str, int], total_rows[0]).get('count', 0) if isinstance(total_rows, list) and total_rows else 0
        all_tickets: List[Dict[str, Any]] = query('SELECT status, severity, confidence_score, resolution_type, created_at FROM tickets')  # pyre-ignore[9]

        sla_compliant = sum(1 for t in all_tickets if t.get('severity') not in ('High', 'Critical'))
        sla_compliance = round(float((sla_compliant / total) * 100), 1) if total > 0 else 0.0  # pyre-ignore[6]

        raw_scores = [float(t.get('confidence_score') or 0.0) for t in all_tickets]
        scaled_scores = [s * 100.0 if s <= 1.0 else (s * 10.0 if s <= 10.0 else s) for s in raw_scores]
        total_confidence = sum(scaled_scores)
        avg_confidence = round(float(total_confidence / total), 1) if total > 0 else 0.0  # pyre-ignore[6]
        csat = round(float(avg_confidence * 0.05), 1) if total > 0 else 0.0  # pyre-ignore[6]

        self_resolved = sum(1 for t in all_tickets if t.get('resolution_type') == 'Self Resolved')
        self_res_rate = round(float((self_resolved / total) * 100), 1) if total > 0 else 0.0  # pyre-ignore[6]

        critical_count = sum(1 for t in all_tickets if t.get('severity') == 'Critical')
        upc_rows = query('SELECT COUNT(DISTINCT problem_summary) as count FROM tickets')
        unique_problems_count: int = cast(Dict[str, int], upc_rows[0]).get('count', 0) if isinstance(upc_rows, list) and upc_rows else 0

        processed_count = sum(1 for t in all_tickets if t.get('status') == 'synced')
        pending_count = sum(1 for t in all_tickets if t.get('status') == 'pending_review')

        now = datetime.now()
        # The following secondary metrics were removed for the redesign
        # keeping the response clean and focused on common problems/causes
        sparklines = {
            'open': [int(round(float(total) * (0.8 + random.random() * 0.4))) for _ in range(7)],
            'response': [int(round(30.0 + random.random() * 60.0)) for _ in range(7)],
            'csat': [round(3.5 + random.random() * 1.5, 1) for _ in range(7)],  # pyre-ignore[6]
            'sla': [round(85.0 + random.random() * 15.0, 1) for _ in range(7)],  # pyre-ignore[6]
            'selfRes': [round(random.random() * 10.0, 1) for _ in range(7)],  # pyre-ignore[6]
            'confidence': [round(60.0 + random.random() * 40.0, 1) for _ in range(7)],  # pyre-ignore[6]
            'critical': [int(round(random.random() * 2.0)) for _ in range(7)]
        }

        return jsonify({
            'common_problems': common_problems,
            'common_root_causes': common_root_causes,
            'common_solutions': common_solutions,
            'categories': categories,
            'top_companies': top_companies,
            'product_area_stats': product_area_stats,
            'resolution_type_stats': resolution_type_stats,
            'sparklines': sparklines,
            'metrics': {
                'total': total,
                'processed_count': processed_count,
                'pending_count': pending_count,
                'critical_count': critical_count,
                'unique_problems_count': unique_problems_count
            }
        })
    except Exception as e:
        print(f'Stats error: {e}')
        return jsonify({'error': 'Failed to fetch stats'}), 500


# ─── Knowledge Base ──────────────────────────────────────────────────────────

@app.route('/api/kb', methods=['GET'])
def get_kb():
    try:
        articles = query('SELECT * FROM knowledge_base ORDER BY last_updated DESC')
        return jsonify(articles)
    except Exception:
        return jsonify({'error': 'Failed to fetch knowledge base'}), 500


@app.route('/api/kb/search', methods=['GET'])
def search_kb():
    q = request.args.get('q', '')
    if not q:
        return jsonify([])
    try:
        p = ph()
        param = f'%{q}%'
        articles = query(f'SELECT * FROM knowledge_base WHERE title LIKE {p} OR content LIKE {p} OR tags LIKE {p}', [param, param, param])
        return jsonify(articles)
    except Exception:
        return jsonify({'error': 'Failed to search knowledge base'}), 500


@app.route('/api/kb/suggest', methods=['GET'])
def suggest_kb():
    ticket_id = request.args.get('ticket_id')
    if not ticket_id:
        return jsonify({'error': 'ticket_id is required'}), 400

    try:
        tickets = query(
            f'SELECT problem_summary, issue_category, issue_subcategory, root_cause FROM tickets WHERE id = {ph()}',
            [ticket_id]
        )
        if not tickets:
            return jsonify({'error': 'Ticket not found'}), 404

        ticket = tickets[0]
        raw_text = ' '.join(filter(None, [
            ticket.get('issue_category', ''),
            ticket.get('issue_subcategory', ''),
            ticket.get('problem_summary', ''),
            ticket.get('root_cause', '')
        ]))

        import re
        stop_words = {'the','and','for','with','that','this','from','have','been','will','are','was','not','but','they','also','into','more','when','your','our'}
        search_terms = list(dict.fromkeys(
            w for w in [
                re.sub(r'[^a-zA-Z0-9]', '', tok)
                for tok in re.split(r'[\s,.\-/]+', raw_text)
            ]
            if len(w) > 2 and w.lower() not in stop_words
        ))
        search_terms = list(search_terms)[:15]  # pyre-ignore[6]

        p = ph()
        suggested = []
        for term in search_terms:
            param = f'%{term}%'
            matches = query(
                f'SELECT id, title, category FROM knowledge_base WHERE title LIKE {p} OR tags LIKE {p} OR content LIKE {p} LIMIT 3',
                [param, param, param]
            )
            suggested.extend(matches)

        seen = {}
        unique = []
        for item in suggested:
            if item['id'] not in seen:
                seen[item['id']] = True
                unique.append(item)

        if len(unique) < 3 and ticket.get('issue_category'):
            cat_matches = query(
                f'SELECT id, title, category FROM knowledge_base WHERE category LIKE {p} LIMIT 3',
                [f"%{ticket['issue_category']}%"]
            )
            for m in cat_matches:
                if m['id'] not in seen:
                    seen[m['id']] = True
                    unique.append(m)

        if not unique:
            unique = query('SELECT id, title, category FROM knowledge_base LIMIT 3')

        unique = list(unique)[:3]  # pyre-ignore[6]
        return jsonify(unique)
    except Exception as e:
        print(f'KB Suggest Error: {e}')
        return jsonify({'error': 'Failed to generate suggestions'}), 500


@app.route('/api/kb/<int:kb_id>', methods=['GET'])
def get_kb_article(kb_id):
    try:
        articles = query(f'SELECT * FROM knowledge_base WHERE id = {ph()}', [kb_id])
        if not articles:
            return jsonify({'error': 'Article not found'}), 404
        return jsonify(articles[0])
    except Exception:
        return jsonify({'error': 'Failed to fetch article'}), 500


# ─── Reports ─────────────────────────────────────────────────────────────────

@app.route('/api/reports/stats', methods=['GET'])
def reports_stats():
    try:
        status_stats = query('SELECT status, COUNT(*) as count FROM tickets GROUP BY status')
        category_stats = query('SELECT issue_category, COUNT(*) as count FROM tickets GROUP BY issue_category')
        top_customers = query('SELECT company_name, COUNT(*) as count FROM tickets GROUP BY company_name ORDER BY count DESC LIMIT 5')
        confidence_trends = query('SELECT created_at, confidence_score FROM tickets ORDER BY created_at DESC LIMIT 30')
        root_cause_stats = query('SELECT root_cause, COUNT(*) as count FROM tickets GROUP BY root_cause')

        return jsonify({
            'statusStats': status_stats,
            'categoryStats': category_stats,
            'topCustomers': top_customers,
            'confidenceTrends': list(reversed(confidence_trends)),
            'rootCauseStats': root_cause_stats
        })
    except Exception as e:
        print(f'Reports Stats Error: {e}')
        return jsonify({'error': 'Failed to fetch report statistics'}), 500


# ─── Accounts ────────────────────────────────────────────────────────────────

@app.route('/api/accounts/pulse', methods=['GET'])
def accounts_pulse():
    try:
        stats = query("""
            SELECT
                company_name,
                COUNT(*) as total_tickets,
                SUM(CASE WHEN status != 'solved' THEN 1 ELSE 0 END) as open_tickets,
                SUM(CASE WHEN status != 'solved' AND severity = 'high' THEN 1 ELSE 0 END) as high_tickets,
                SUM(CASE WHEN status != 'solved' AND severity = 'critical' THEN 1 ELSE 0 END) as critical_tickets
            FROM tickets
            GROUP BY company_name
        """)

        pulse_data = []
        for s in stats:
            score = 100
            score -= (s.get('open_tickets') or 0) * 5
            score -= (s.get('high_tickets') or 0) * 10
            score -= (s.get('critical_tickets') or 0) * 20
            score = max(0, min(100, score))
            pulse_data.append({
                **s,
                'health_score': score,
                'status': 'Healthy' if score > 80 else ('Warning' if score > 50 else 'Critical')
            })

        return jsonify(pulse_data)
    except Exception as e:
        print(f'Account Pulse Error: {e}')
        return jsonify({'error': 'Failed to fetch account pulse data'}), 500


# ─── Startup ─────────────────────────────────────────────────────────────────

def start():
    init_db()
    check_connection()
    ensure_kb_articles()
    migrate_ticket_statuses()
    print(f'Flask server running at http://localhost:{PORT}')
    app.run(host='0.0.0.0', port=PORT, debug=True)


if __name__ == '__main__':
    start()
