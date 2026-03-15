const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
require('dotenv').config();

let db;

async function initDB() {
    const dbType = process.env.DB_TYPE || 'sqlite';

    if (dbType === 'mysql') {
        try {
            db = await mysql.createPool({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'zendesk_demo',
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            console.log('Connected to MySQL database');
            
            await db.execute(`
                CREATE TABLE IF NOT EXISTS tickets (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    problem_summary TEXT,
                    solution_summary TEXT,
                    company_name VARCHAR(255),
                    issue_category VARCHAR(100),
                    issue_subcategory VARCHAR(100),
                    root_cause TEXT,
                    suggested_action TEXT,
                    ideal_resolution_tier VARCHAR(20),
                    churn_risk VARCHAR(10),
                    upsell_opportunity VARCHAR(10),
                    severity VARCHAR(20),
                    feature_request TEXT,
                    product_area VARCHAR(255),
                    confidence_score INT,
                    status VARCHAR(50) DEFAULT 'analyzed',
                    resolution_type VARCHAR(50) DEFAULT 'Unknown',
                    stakeholders JSON,
                    device_ids JSON,
                    notes TEXT,
                    reasoning TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Migrate existing table if columns are missing
            try {
                await db.execute('SELECT status FROM tickets LIMIT 1');
            } catch (err) {
                console.log('Adding status column to MySQL tickets table...');
                await db.execute("ALTER TABLE tickets ADD COLUMN status VARCHAR(50) DEFAULT 'analyzed'");
            }

            try {
                await db.execute('SELECT stakeholders FROM tickets LIMIT 1');
            } catch (err) {
                console.log('Adding stakeholders column to MySQL...');
                await db.execute("ALTER TABLE tickets ADD COLUMN stakeholders JSON");
            }
            try {
                await db.execute('SELECT device_ids FROM tickets LIMIT 1');
            } catch (err) {
                console.log('Adding device_ids column to MySQL...');
                await db.execute("ALTER TABLE tickets ADD COLUMN device_ids JSON");
            }
            try {
                await db.execute('SELECT notes FROM tickets LIMIT 1');
            } catch (err) {
                console.log('Adding notes column to MySQL...');
                await db.execute("ALTER TABLE tickets ADD COLUMN notes TEXT");
            }
            try {
                await db.execute('SELECT reasoning FROM tickets LIMIT 1');
            } catch (err) {
                console.log('Adding reasoning column to MySQL...');
                await db.execute("ALTER TABLE tickets ADD COLUMN reasoning TEXT");
            }
        } catch (error) {
            console.error('MySQL connection failed, falling back to SQLite:', error.message);
            process.env.DB_TYPE = 'sqlite';
            return initDB();
        }
    } else {
        db = await open({
            filename: path.join(__dirname, 'database.sqlite'),
            driver: sqlite3.Database
        });
        console.log('Connected to SQLite database');

        await db.exec(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                severity TEXT,
                feature_request TEXT,
                product_area TEXT,
                confidence_score INTEGER,
                status TEXT DEFAULT 'analyzed',
                resolution_type TEXT DEFAULT 'Unknown',
                stakeholders TEXT,
                device_ids TEXT,
                notes TEXT,
                reasoning TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migrate existing SQLite table if columns are missing
        try {
            await db.get('SELECT status FROM tickets LIMIT 1');
        } catch (err) {
            console.log('Adding status column to SQLite tickets table...');
            await db.exec("ALTER TABLE tickets ADD COLUMN status TEXT DEFAULT 'analyzed'");
        }

        try {
            await db.get('SELECT stakeholders FROM tickets LIMIT 1');
        } catch (err) {
            console.log('Adding stakeholders column to SQLite...');
            await db.exec("ALTER TABLE tickets ADD COLUMN stakeholders TEXT");
        }
        try {
            await db.get('SELECT device_ids FROM tickets LIMIT 1');
        } catch (err) {
            console.log('Adding device_ids column to SQLite...');
            await db.exec("ALTER TABLE tickets ADD COLUMN device_ids TEXT");
        }
        try {
            await db.get('SELECT notes FROM tickets LIMIT 1');
        } catch (err) {
            console.log('Adding notes column to SQLite...');
            await db.exec("ALTER TABLE tickets ADD COLUMN notes TEXT");
        }
    }
}

async function getDB() {
    if (!db) await initDB();
    return db;
}

async function query(sql, params) {
    const database = await getDB();
    const dbType = process.env.DB_TYPE || 'sqlite';

    if (dbType === 'mysql') {
        const [results] = await database.execute(sql, params);
        return results;
    } else {
        // SQLite 'run' for mutations, 'all' for selections
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            return await database.all(sql, params);
        } else {
            const result = await database.run(sql, params);
            return { insertId: result.lastID, affectedRows: result.changes };
        }
    }
}

async function insertTicket(data) {
    const sql = `
        INSERT INTO tickets (
            problem_summary, solution_summary, company_name, issue_category, 
            issue_subcategory, root_cause, suggested_action, ideal_resolution_tier, 
            churn_risk, upsell_opportunity, severity, feature_request, 
            product_area, confidence_score, status, resolution_type,
            stakeholders, device_ids, notes, reasoning
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const status = data.status || (data.confidence_score < 7 ? 'pending_review' : 'analyzed');
    const company = data.company_name || data.customer || 'Factbird';
    const churn = data.churn_risk === true || data.churn_risk === 'YES' ? 'YES' : 'NO';
    const upsell = data.upsell_opportunity === true || data.upsell_opportunity === 'YES' ? 'YES' : 'NO';

    const params = [
        data.problem_summary, 
        data.solution_summary, 
        company, 
        data.issue_category || 'Uncategorized',
        data.issue_subcategory || '', 
        data.root_cause || '', 
        data.suggested_action || '', 
        data.ideal_resolution_tier || 'T1',
        churn, 
        upsell, 
        data.severity, 
        data.feature_request,
        data.product_area, 
        data.confidence_score, 
        status, 
        data.resolution_type || 'Unknown',
        JSON.stringify(data.stakeholders || []),
        JSON.stringify(data.device_ids || []),
        data.notes || '',
        data.reasoning || ''
    ];

    return await query(sql, params);
}

module.exports = { query, initDB, insertTicket };
