const axios = require('axios');

const tickets = [
    {
        customer_email: "jane@acme.corp",
        problem: "Users reporting 404 errors on the login page after the latest deployment.",
        solution: "Reverted the frontend build to previous stable version and cleared CDN cache."
    },
    {
        customer_email: "bill@startup.io",
        problem: "Database connection timeouts occurring every day at 2 PM UTC.",
        solution: "Increased the connection pool size and optimized the heavy cron job query."
    },
    {
        customer_email: "support@fintech.com",
        problem: "Customer cannot see their last three transactions in the mobile app.",
        solution: "Manually triggered a sync for the user account and fixed the caching layer bug."
    },
    {
        customer_email: "dev@webshop.net",
        problem: "The checkout button is hidden on mobile devices in landscape mode.",
        solution: "Updated CSS media queries to handle landscape orientation properly."
    },
    {
        customer_email: "admin@global.org",
        problem: "Received a suspicious number of password reset requests from a single IP range.",
        solution: "Implemented rate limiting on the password reset endpoint and blocked the suspicious IP range."
    }
];

async function populate() {
    console.log("Populating demo data...");
    for (const ticket of tickets) {
        try {
            const res = await axios.post('http://localhost:5001/api/tickets', ticket);
            console.log(`Added ticket: ${res.data.issue_category} - ${res.data.issue_subcategory}`);
        } catch (err) {
            console.error("Failed to add ticket:", err.message);
        }
    }
    console.log("Done.");
}

populate();
