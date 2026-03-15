const { processTicket } = require('./ai');
const { query, insertTicket } = require('./db');

const complexTicket = {
    problem: "Hi, I'm Mathias Hviid Kristensen. We are having trouble with Duo sensor 84ed36fd32882301 at the BGL plant. Mike Campbell from engineering is also looking into this. It's offline and won't reconnect.",
    solution: "John from support checked the gateway logs. We confirmed that the sensor was out of range. Moving the gateway closer fixed it.",
    email: "mathias@bgl.dk"
};

async function verifyExpansion() {
    console.log("--- End-to-End Database Expansion Verification ---");

    try {
        console.log("1. Processing complex ticket with AI...");
        const aiData = await processTicket(complexTicket.problem, complexTicket.solution, complexTicket.email);
        
        console.log("Stakeholders Extracted:", JSON.stringify(aiData.stakeholders));
        console.log("Device IDs Extracted:", JSON.stringify(aiData.device_ids));
        console.log("Problem Summary:", aiData.problem_summary);

        console.log("\n2. Storing in database via insertTicket utility...");
        const result = await insertTicket(aiData);
        const ticketId = result.insertId;
        console.log("Ticket inserted with ID:", ticketId);

        console.log("\n3. Retrieving and verifying data...");
        const [retrieved] = await query("SELECT * FROM tickets WHERE id = ?", [ticketId]);
        
        console.log("Retrieved Stakeholders:", retrieved.stakeholders);
        console.log("Retrieved Device IDs:", retrieved.device_ids);
        console.log("Retrieved Notes:", retrieved.notes);

        if (retrieved.stakeholders && retrieved.device_ids) {
            const sh = typeof retrieved.stakeholders === 'string' ? JSON.parse(retrieved.stakeholders) : retrieved.stakeholders;
            const di = typeof retrieved.device_ids === 'string' ? JSON.parse(retrieved.device_ids) : retrieved.device_ids;
            
            if (sh.length > 0 && di.length > 0) {
                console.log("\n✅ SUCCESS: Full-flow expansion verified!");
            } else {
                console.log("\n⚠️ WARN: Extraction was empty, check prompt grounding.");
            }
        }
    } catch (err) {
        console.error("❌ ERROR during verification:", err);
    }
}

verifyExpansion();
