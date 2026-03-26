import os
import json
import sqlite3
import mysql.connector  # pyre-ignore[21]
from mysql.connector import pooling  # pyre-ignore[21]
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv  # pyre-ignore[21]
from typing import List, Dict, Union, Any, Optional, cast

load_dotenv(dotenv_path=Path(__file__).parent / '.env')

_mysql_pool: Optional[pooling.MySQLConnectionPool] = None
_sqlite_conn: Optional[sqlite3.Connection] = None


def _get_db_type() -> str:
    return cast(str, os.environ.get('DB_TYPE', 'sqlite'))


def _get_mysql_pool() -> pooling.MySQLConnectionPool:
    global _mysql_pool
    if _mysql_pool is None:
        _mysql_pool = pooling.MySQLConnectionPool(
            pool_name="zendesk_pool",
            pool_size=5,
            host=os.environ.get('DB_HOST', 'localhost'),
            user=os.environ.get('DB_USER', 'root'),
            password=os.environ.get('DB_PASSWORD', ''),
            database=os.environ.get('DB_NAME', 'zendesk_demo'),
        )
    return _mysql_pool


def _get_sqlite_conn() -> sqlite3.Connection:
    global _sqlite_conn
    if _sqlite_conn is None:
        db_path = Path(__file__).parent / 'database.sqlite'
        _sqlite_conn = sqlite3.connect(str(db_path), check_same_thread=False)
        _sqlite_conn.row_factory = sqlite3.Row
    return _sqlite_conn


def query(sql: str, params: Optional[List[Any]] = None) -> Any:
    """Executes a SQL query and returns rows for SELECT or metadata for others."""
    params = params or []
    db_type = _get_db_type()

    if db_type == 'mysql':
        pool = _get_mysql_pool()
        conn = pool.get_connection()
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(sql, params)
            sql_upper = sql.strip().upper()
            if sql_upper.startswith('SELECT') or sql_upper.startswith('PRAGMA'):
                rows = cursor.fetchall()
                cursor.close()
                return rows if rows is not None else []
            else:
                conn.commit()
                insert_id = cursor.lastrowid
                row_count = cursor.rowcount
                cursor.close()
                return {'insertId': insert_id, 'affectedRows': row_count}
        finally:
            conn.close()
    else:
        conn = _get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute(sql, params)
        sql_upper = sql.strip().upper()
        if sql_upper.startswith('SELECT') or sql_upper.startswith('PRAGMA'):
            rows = [dict(row) for row in cursor.fetchall()]
            return rows
        else:
            conn.commit()
            return {'insertId': cursor.lastrowid, 'affectedRows': cursor.rowcount}


def _column_exists_mysql(table: str, column: str) -> bool:
    try:
        query(f'SELECT `{column}` FROM `{table}` LIMIT 1')
        return True
    except Exception:
        return False


def _column_exists_sqlite(table: str, column: str) -> bool:
    rows = query(f"PRAGMA table_info({table})")
    if not isinstance(rows, list):
        return False
    return any(cast(Dict[str, Any], r).get('name') == column for r in rows)


def init_db() -> None:
    db_type = _get_db_type()

    if db_type == 'mysql':
        try:
            _get_mysql_pool()  # Test connection
            print('Connected to MySQL database')

            query("""
                CREATE TABLE IF NOT EXISTS tickets (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    Description TEXT,
                    Email_Text TEXT,
                    Comments TEXT,
                    problem_summary TEXT,
                    solution_summary TEXT,
                    company_name VARCHAR(255),
                    issue_category VARCHAR(100),
                    issue_subcategory VARCHAR(100),
                    root_cause TEXT,
                    suggested_action TEXT,
                    ideal_resolution_tier VARCHAR(255),
                    churn_risk VARCHAR(10),
                    upsell_opportunity VARCHAR(10),
                    expansion_signal VARCHAR(10),
                    preventability VARCHAR(100),
                    severity VARCHAR(20),
                    feature_request TEXT,
                    product_area VARCHAR(255),
                    confidence_score INT,
                    status VARCHAR(50) DEFAULT 'OPEN',
                    resolution_type VARCHAR(50) DEFAULT 'Unknown',
                    stakeholders JSON,
                    device_ids JSON,
                    notes TEXT,
                    reasoning TEXT,
                    conversation_thread JSON,
                    processed_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            for col, coltype in [
                ('Description', 'TEXT'),
                ('Email_Text', 'TEXT'),
                ('Comments', 'TEXT'),
                ('status', "VARCHAR(50) DEFAULT 'OPEN'"),
                ('stakeholders', 'JSON'),
                ('device_ids', 'JSON'),
                ('notes', 'TEXT'),
                ('reasoning', 'TEXT'),
                ('conversation_thread', 'JSON'),
                ('expansion_signal', 'VARCHAR(10)'),
                ('preventability', 'VARCHAR(100)'),
                ('processed_at', 'TIMESTAMP NULL'),
            ]:
                if not _column_exists_mysql('tickets', col):
                    print(f'Adding {col} column to MySQL tickets table...')
                    query(f'ALTER TABLE tickets ADD COLUMN {col} {coltype}')

            query("""
                CREATE TABLE IF NOT EXISTS knowledge_base (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    category VARCHAR(100),
                    content TEXT,
                    tags VARCHAR(500),
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """)

            _seed_kb_if_empty()
            
            # New Refined Tickets Table (MySQL)
            query("""
                CREATE TABLE IF NOT EXISTS refined_tickets (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    Description TEXT,
                    Email_Text TEXT,
                    Comments TEXT,
                    problem_summary TEXT,
                    solution_summary TEXT,
                    company_name VARCHAR(255),
                    issue_category VARCHAR(100),
                    issue_subcategory VARCHAR(100),
                    root_cause TEXT,
                    suggested_action TEXT,
                    ideal_resolution_tier VARCHAR(255),
                    churn_risk VARCHAR(10),
                    upsell_opportunity VARCHAR(10),
                    expansion_signal VARCHAR(10),
                    preventability VARCHAR(100),
                    severity VARCHAR(20),
                    feature_request TEXT,
                    product_area VARCHAR(255),
                    confidence_score INT,
                    status VARCHAR(50) DEFAULT 'pending',
                    resolution_type VARCHAR(50) DEFAULT 'Unknown',
                    stakeholders JSON,
                    device_ids JSON,
                    notes TEXT,
                    reasoning TEXT,
                    conversation_thread JSON,
                    processed_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            seed_tickets()

        except Exception as e:
            print(f'MySQL connection failed, falling back to SQLite: {e}')
            os.environ['DB_TYPE'] = 'sqlite'
            init_db()

    else:
        conn = _get_sqlite_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                Description TEXT,
                Email_Text TEXT,
                Comments TEXT,
                problem_summary TEXT,
                solution_summary TEXT,
                company_name TEXT,
                issue_category TEXT,
                issue_subcategory TEXT,
                root_cause TEXT,
                suggested_action TEXT,
                ideal_resolution_tier TEXT,
                churn_risk TEXT,
                upsell_opportunity TEXT,
                expansion_signal TEXT,
                preventability TEXT,
                severity TEXT,
                feature_request TEXT,
                product_area TEXT,
                confidence_score INTEGER,
                status TEXT DEFAULT 'OPEN',
                resolution_type TEXT DEFAULT 'Unknown',
                stakeholders TEXT,
                device_ids TEXT,
                notes TEXT,
                reasoning TEXT,
                conversation_thread TEXT,
                processed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print('Connected to SQLite database')

        for col, coltype in [
            ('Description', 'TEXT'),
            ('Email_Text', 'TEXT'),
            ('Comments', 'TEXT'),
            ('status', "TEXT DEFAULT 'OPEN'"),
            ('stakeholders', 'TEXT'),
            ('device_ids', 'TEXT'),
            ('notes', 'TEXT'),
            ('reasoning', 'TEXT'),
            ('conversation_thread', 'TEXT'),
            ('expansion_signal', 'TEXT'),
            ('preventability', 'TEXT'),
            ('processed_at', 'DATETIME'),
        ]:
            if not _column_exists_sqlite('tickets', col):
                print(f'Adding {col} column to SQLite tickets table...')
                conn.execute(f'ALTER TABLE tickets ADD COLUMN {col} {coltype}')
                conn.commit()

        conn.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_base (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                category TEXT,
                content TEXT,
                tags TEXT,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()

        _seed_kb_if_empty()

        # New Refined Tickets Table (SQLite)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS refined_tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                Description TEXT,
                Email_Text TEXT,
                Comments TEXT,
                problem_summary TEXT,
                solution_summary TEXT,
                company_name TEXT,
                issue_category TEXT,
                issue_subcategory TEXT,
                root_cause TEXT,
                suggested_action TEXT,
                ideal_resolution_tier TEXT,
                churn_risk TEXT,
                upsell_opportunity TEXT,
                expansion_signal TEXT,
                preventability TEXT,
                severity TEXT,
                feature_request TEXT,
                product_area TEXT,
                confidence_score INTEGER,
                status TEXT DEFAULT 'pending',
                resolution_type TEXT DEFAULT 'Unknown',
                stakeholders TEXT,
                device_ids TEXT,
                notes TEXT,
                reasoning TEXT,
                conversation_thread TEXT,
                processed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


def _seed_kb_if_empty() -> None:
    rows = query('SELECT COUNT(*) as count FROM knowledge_base')
    count = 0
    if rows and isinstance(rows, list) and len(rows) > 0:
        count = cast(Dict[str, int], rows[0]).get('count', 0)
        
    if count == 0:
        kb_articles = [
            ('Troubleshooting Sensor Connectivity', 'Sensor Connectivity',
             'Steps to diagnose and resolve offline sensors and gateway connectivity issues. Check power, network, and device pairing status.',
             'sensor, offline, gateway, connectivity, troubleshoot'),
            ('Hardware Migration: Factbird Duo Setup', 'Device Configuration',
             'How to migrate configuration from an old Factbird Duo to a new replacement unit. Contact support to copy device settings remotely.',
             'duo, migration, setup, hardware, replace, copy config'),
            ('Activity Template Configuration', 'Platform Configuration',
             'Guide to creating activity templates and assigning them to stop causes on specific production lines and sites.',
             'activity, template, stop cause, contamination, configuration'),
            ('Stop Cause Setup Guide', 'Platform Configuration',
             'How to configure stop causes including custom categories, activity assignments, and line-specific settings.',
             'stop cause, setup, activity, line, configuration'),
            ('Account Password Reset', 'Account Access',
             'Steps to reset your Factbird account password. A reset link is sent to the registered email address.',
             'password, reset, login, account, access'),
            ('Sensor Splitter Installation Guide', 'Sensor Connectivity',
             'How to install splitters when multiple sensors (3+) share a single line. Verify data ingestion after installation.',
             'splitter, sensor, install, data, line, ompak'),
            ('Data Not Appearing in Dashboard', 'Data Reporting Issue',
             'Troubleshooting steps when sensor data is not showing in the Factbird dashboard. Check gateway, connectivity, and time sync.',
             'data, missing, dashboard, report, sensor'),
            ('Factbird Duo Initial Installation', 'Device Configuration',
             'Step-by-step guide for first-time Factbird Duo installation including mounting, pairing, and configuration.',
             'duo, install, setup, first time, configuration')
        ]
        for title, category, content, tags in kb_articles:
            query(
                'INSERT INTO knowledge_base (title, category, content, tags) VALUES (?, ?, ?, ?)' if _get_db_type() == 'sqlite'
                else 'INSERT INTO knowledge_base (title, category, content, tags) VALUES (%s, %s, %s, %s)',
                [title, category, content, tags]
            )
        print('Knowledge Base seeded with default articles ✅')


def ensure_kb_articles() -> None:
    required_articles = [
        ('Troubleshooting Sensor Connectivity', 'Sensor Connectivity',
         'Steps to diagnose and resolve offline sensors and gateway connectivity issues. Check power, network, and device pairing status.',
         'sensor, offline, gateway, connectivity, troubleshoot'),
        ('Hardware Migration: Factbird Duo Setup', 'Device Configuration',
         'How to migrate configuration from an old Factbird Duo to a new replacement unit. Contact support to copy device settings remotely.',
         'duo, migration, setup, hardware, replace, copy config, factbird'),
        ('Activity Template Configuration', 'Platform Configuration',
         'Guide to creating activity templates and assigning them to stop causes on specific production lines and sites.',
         'activity, template, stop cause, contamination, configuration, platform'),
        ('Stop Cause Setup Guide', 'Platform Configuration',
         'How to configure stop causes including custom categories, activity assignments, and line-specific settings.',
         'stop cause, setup, activity, line, configuration, platform'),
        ('Account Password Reset', 'Account Access',
         'Steps to reset your account password. A reset link is sent to the registered email address. Contact support for login or access issues.',
         'password, reset, login, account, access, authentication, credentials, failure'),
        ('Sensor Splitter Installation Guide', 'Sensor Connectivity',
         'How to install splitters when multiple sensors (3+) share a single line. Verify data ingestion after installation.',
         'splitter, sensor, install, data, line, ompak, connectivity'),
        ('Data Not Appearing in Dashboard', 'Data Reporting Issue',
         'Troubleshooting steps when sensor data is not showing in the dashboard. Check gateway, connectivity, and time sync.',
         'data, missing, dashboard, report, sensor, display, reporting'),
        ('Factbird Duo Initial Installation', 'Device Configuration',
         'Step-by-step guide for first-time Factbird Duo installation including mounting, pairing, and configuration.',
         'duo, install, setup, first time, configuration, device, hardware'),
        ('User Account & Access Management', 'Account Access',
         'Managing user accounts, roles, and permissions. Covers login issues, account lockouts, password resets, and access rights.',
         'account, access, login, user, permission, role, locked, authentication, credentials'),
        ('Gateway Offline Troubleshooting', 'Sensor Connectivity',
         'How to diagnose and resolve gateway connectivity issues. Covers network, power, and firmware checks.',
         'gateway, offline, connectivity, network, power, firmware, sensor'),
        ('Production Line Configuration', 'Platform Configuration',
         'Setting up and managing production lines including OEE targets, shift patterns, and downtime categories.',
         'production, line, oee, shift, downtime, configuration, setup'),
        ('Hardware Replacement Guide', 'Device Configuration',
         'Process for replacing faulty hardware including RMA procedures and reconfiguration steps.',
         'hardware, replacement, faulty, rma, device, repair, broken')
    ]

    ph = '?' if _get_db_type() == 'sqlite' else '%s'
    for title, category, content, tags in required_articles:
        existing = query(f'SELECT id FROM knowledge_base WHERE title = {ph}', [title])
        if not (isinstance(existing, list) and len(existing) > 0):
            query(
                f'INSERT INTO knowledge_base (title, category, content, tags) VALUES ({ph}, {ph}, {ph}, {ph})',
                [title, category, content, tags]
            )
            print(f'KB article added: {title}')
    print('KB articles verified ✅')


def seed_tickets() -> None:
    try:
        # Step 1: Clear existing data for a fresh start
        print('Resetting tickets table for repopulation...')
        query('DELETE FROM tickets')
        
        # Reset auto-increment
        db_type = _get_db_type()
        if db_type == 'sqlite':
            try:
                query("DELETE FROM sqlite_sequence WHERE name='tickets'")
            except Exception:
                pass
        elif db_type == 'mysql':
            try:
                query("ALTER TABLE tickets AUTO_INCREMENT = 1")
            except Exception:
                pass
                
        # Step 2: Insert 10 fresh sample records (Production-Grade)
        samples = [
            ("Novo Nordisk", "MB77 Offline Production Issue", "MB77 production line went offline at 02:30 AM. Operator reports intermittent PLC-to-gateway communication failure. Restart attempts did not restore connectivity. Production is currently stopped and impacting output KPIs.", "Critical line stoppage.", "NO", "YES", "YES"),
            ("Arla Foods", "SSO Login Failure (Arla Users)", "SSO login is failing for multiple Arla users after recent security update. Some users can log in successfully while others receive 403 Forbidden error. Issue may be related to Azure AD token validation or identity provider misconfiguration.", "Identity/Access issue.", "YES", "NO", "NO"),
            ("Danish Crown", "Contamination Button Request (Line 12)", "Customer requests addition of a “Contamination” button on Line 12 for stop reason classification. Requirement is needed for compliance reporting and improved OEE tracking across production shifts.", "Feature request.", "NO", "YES", "NO"),
            ("Radiometer Medical", "Factbird Duo Migration Issue", "Need to migrate configuration from old Factbird Duo device to a new unit. Customer wants to ensure all settings, mappings, and connectivity parameters are copied without data loss or downtime.", "Device migration.", "NO", "NO", "YES"),
            ("Royal Unibrew", "OEE Report Email Failure", "Weekly OEE report emails have not been delivered for the last 3 cycles. Backend logs show repeated SMTP timeout errors. Manufacturing team relies on this report for KPI monitoring.", "Report delivery failure.", "YES", "NO", "NO"),
            ("Convatec", "Gateway Firmware Update Request", "Customer requests firmware update for IoT gateway devices deployed across multiple sites. Concern about compatibility with existing PLC integrations and potential downtime during update.", "Maintenance request.", "NO", "YES", "NO"),
            ("Kepware / PTC", "PLC Connectivity Drop (Kepware)", "Intermittent connectivity drop observed between PLC devices and Kepware OPC server. Issue causes data gaps in production monitoring dashboard. Problem appears to occur randomly every few hours.", "Connectivity stability.", "NO", "NO", "YES"),
            ("Factbird Internal", "New User Account Request", "Request to create new login account for employee “Peter” in production monitoring system. User requires access to dashboard and reporting modules with read-only permissions.", "User management.", "NO", "NO", "NO"),
            ("Developer Support", "API Documentation Request", "Customer is requesting updated API documentation for integrating Factbird data into internal ERP system. Needs authentication flow, endpoint list, and example payloads.", "Technical support.", "NO", "YES", "NO"),
            ("Customer Service", "Sensor Signal Scaling Issue", "Sensor readings from Line 5 are showing incorrect scaling values in dashboard. Raw data appears correct but transformed values are inconsistent, causing incorrect production metrics.", "Calibration issue.", "NO", "NO", "NO")
        ]
        ph = '?' if db_type == 'sqlite' else '%s'
        for comp, desc, email_text, comm, churn, upsell, expansion in samples:
            query(
                f'INSERT INTO tickets (company_name, Description, Email_Text, Comments, status, churn_risk, upsell_opportunity, expansion_signal) VALUES ({ph}, {ph}, {ph}, {ph}, "OPEN", {ph}, {ph}, {ph})',
                [comp, desc, email_text, comm, churn, upsell, expansion]
            )
        print('Tickets table successfully reset and seeded with 10 production-grade records ✅')
    except Exception as e:
        print(f'Seeding failed: {e}')
        raise


def update_refined_ticket(ticket_id: int, data: Dict[str, Any]) -> Any:
    ph = '?' if _get_db_type() == 'sqlite' else '%s'
    
    confidence_raw = data.get('confidence_score', 0)
    confidence = float(confidence_raw) if confidence_raw is not None else 0.0
    if confidence <= 1.0:
        confidence = round(confidence * 100)
    elif confidence <= 10.0:
        confidence = round(confidence * 10)
    else:
        confidence = round(confidence)
        
    status = data.get('status') or ('synced' if confidence >= 70 else 'pending_review')
    
    churn_raw = data.get('churn_risk', 'NO')
    churn = 'YES' if churn_raw in (True, 'YES', 'yes', 'Yes') else 'NO'
    upsell_raw = data.get('upsell_opportunity', 'NO')
    upsell = 'YES' if upsell_raw in (True, 'YES', 'yes', 'Yes') else 'NO'
    exp_raw = data.get('expansion_signal', 'No')
    expansion = 'Yes' if exp_raw in (True, 'YES', 'yes', 'Yes') else 'No'

    sql = f"""
        UPDATE refined_tickets SET
            problem_summary = {ph},
            solution_summary = {ph},
            company_name = {ph},
            issue_category = {ph},
            issue_subcategory = {ph},
            root_cause = {ph},
            suggested_action = {ph},
            ideal_resolution_tier = {ph},
            churn_risk = {ph},
            upsell_opportunity = {ph},
            expansion_signal = {ph},
            preventability = {ph},
            severity = {ph},
            feature_request = {ph},
            product_area = {ph},
            confidence_score = {ph},
            status = {ph},
            resolution_type = {ph},
            stakeholders = {ph},
            device_ids = {ph},
            notes = {ph},
            reasoning = {ph},
            conversation_thread = {ph},
            processed_at = {ph}
        WHERE id = {ph}
    """

    params = [
        data.get('problem_summary'),
        data.get('solution_summary'),
        data.get('company_name', 'Customer'),
        data.get('issue_category') or 'Uncategorized',
        data.get('issue_subcategory') or '',
        data.get('root_cause') or '',
        data.get('suggested_action') or '',
        data.get('ideal_resolution_tier') or 'Tier 1',
        churn,
        upsell,
        expansion,
        data.get('preventability') or 'Not Preventable',
        data.get('severity'),
        data.get('feature_request'),
        data.get('product_area'),
        confidence,
        status,
        data.get('resolution_type') or 'Unknown',
        json.dumps(data.get('stakeholders') or []),
        json.dumps(data.get('device_ids') or []),
        data.get('notes') or '',
        data.get('reasoning') or '',
        json.dumps(data.get('conversation_thread') or []),
        datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        ticket_id
    ]

    return query(sql, params)


def insert_ticket(data: Dict[str, Any]) -> Any:
    ph = '?' if _get_db_type() == 'sqlite' else '%s'
    sql = f"""
        INSERT INTO tickets (
            Description, Email_Text, Comments,
            problem_summary, solution_summary, company_name, issue_category,
            issue_subcategory, root_cause, suggested_action, ideal_resolution_tier,
            churn_risk, upsell_opportunity, expansion_signal, preventability, severity, feature_request,
            product_area, confidence_score, status, resolution_type,
            stakeholders, device_ids, notes, reasoning, conversation_thread, processed_at
        ) VALUES ({','.join([ph]*27)})
    """

    confidence_raw = data.get('confidence_score', 0)
    confidence = float(confidence_raw) if confidence_raw is not None else 0.0
    
    # Normalize to 0-100 range regardless of how AI returns it
    if confidence <= 1.0:
        confidence = round(confidence * 100)
    elif confidence <= 10.0:
        confidence = round(confidence * 10)
    else:
        confidence = round(confidence)
        
    status = data.get('status') or ('synced' if confidence >= 70 else 'pending_review')
    company = data.get('company_name') or data.get('customer') or 'Customer'
            
    churn_raw = data.get('churn_risk', 'NO')
    churn = 'YES' if churn_raw in (True, 'YES', 'yes', 'Yes') else 'NO'
    upsell_raw = data.get('upsell_opportunity', 'NO')
    upsell = 'YES' if upsell_raw in (True, 'YES', 'yes', 'Yes') else 'NO'
    exp_raw = data.get('expansion_signal', 'No')
    expansion = 'Yes' if exp_raw in (True, 'YES', 'yes', 'Yes') else 'No'

    params = [
        data.get('Description') or data.get('Description_Raw') or '',
        data.get('Email_Text') or data.get('Email_Text_Raw') or '',
        data.get('Comments') or data.get('Comments_Raw') or '',
        data.get('problem_summary'),
        data.get('solution_summary'),
        company,
        data.get('issue_category') or 'Uncategorized',
        data.get('issue_subcategory') or '',
        data.get('root_cause') or '',
        data.get('suggested_action') or '',
        data.get('ideal_resolution_tier') or 'Tier 1',
        churn,
        upsell,
        expansion,
        data.get('preventability') or 'Not Preventable',
        data.get('severity'),
        data.get('feature_request'),
        data.get('product_area'),
        confidence,
        status,
        data.get('resolution_type') or 'Unknown',
        json.dumps(data.get('stakeholders') or []),
        json.dumps(data.get('device_ids') or []),
        data.get('notes') or '',
        data.get('reasoning') or '',
        json.dumps(data.get('conversation_thread') or []),
        data.get('processed_at'),
    ]

    return query(sql, params)


def migrate_ticket_statuses() -> None:
    """Normalize stored confidence scores to 0-100 and set status based on threshold."""
    try:
        db_type = _get_db_type()
        # Step 1: normalize scores stored as 0-1 (e.g. 0.8 → 80)
        query("UPDATE tickets SET confidence_score = ROUND(confidence_score * 100) WHERE confidence_score > 0 AND confidence_score <= 1")
        query("UPDATE tickets SET confidence_score = ROUND(confidence_score * 10)  WHERE confidence_score > 1  AND confidence_score <= 10")

        # Step 2: auto-sync tickets with confidence >= 70; mark the rest as pending_review
        query("UPDATE tickets SET status = 'synced'         WHERE CAST(confidence_score AS DECIMAL) >= 70 AND status != 'synced'")
        query("UPDATE tickets SET status = 'pending_review' WHERE CAST(confidence_score AS DECIMAL) <  70 AND status != 'synced'")

        print('Ticket status migration complete ✅')
    except Exception as e:
        print(f'Ticket status migration failed ⚠️: {e}')


def check_connection() -> bool:
    try:
        query('SELECT 1')
        print('Database Connection Verified ✅')
        return True
    except Exception as e:
        print(f'Database connection check failed ❌: {e}')
        raise
