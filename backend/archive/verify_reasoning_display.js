const { processTicket } = require('./ai');
const { query, insertTicket } = require('./db');

const complexTicket = {
    problem: "Mathias Hviid Kristensen here. Gateway 84ed36f is acting up at the Denmark plant. Mike Campbell thinks it's a firmware issue. We need a remote reboot.",
    solution: "Support agent John Schweizer initiated a remote OTA update. Fixed the connectivity lag.",
    email: "mathias@factbird.ai"
};

async function verifyExpansion() {
    console.log("--- End-to-End Verification with Reasoning ---");

    try {
        console.log("1. Processing ticket...");
        const aiData = await processTicket(complexTicket.problem, complexTicket.solution, complexTicket.email);
        
        console.log("Reasoning Captured:", aiData.reasoning.substring(0, 50) + "...");

        console.log("\n2. Storing in database...");
        const result = await insertTicket(aiData);
        const ticketId = result.insertId;
        console.log("Ticket inserted with ID:", ticketId);

        console.log("\n3. Verifying DB Persistence...");
        const [retrieved] = await query("SELECT * FROM tickets WHERE id = ?", [ticketId]);
        
        if (retrieved.reasoning && retrieved.stakeholders) {
            console.log("✅ SUCCESS: Reasoning and Stakeholders persisted in DB.");
            console.log("STAKEHOLDERS:", retrieved.stakeholders);
        } else {
            console.log("❌ ERROR: Missing fields in DB retrieval.");
        }
    } catch (err) {
        console.error("❌ ERROR:", err);
    }
}

verifyExpansion();
