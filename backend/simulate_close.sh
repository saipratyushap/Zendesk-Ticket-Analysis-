#!/bin/bash

# Configuration
API_URL="http://localhost:5003/api/tickets/close"

echo "🚀 Simulating Real-World Ticket Closure via API..."
echo "--------------------------------------------------"

# Example Ticket Data
JSON_DATA='{
  "ticket_id": 999,
  "title": "Severe: Production Database Connection Timeout",
  "description": "After the recent infrastructure migration to AWS ap-southeast-1, we are seeing intermittent 504 Gateway Timeouts and database connection pool exhausted errors specifically during peak load (14:00 - 16:00 UTC)."
}'

# Execute Curl
curl -X POST "$API_URL" \
     -H "Content-Type: application/json" \
     -d "$JSON_DATA"

echo -e "\n\n✅ Simulation Triggered. Check the 'Database View' in the dashboard to see instant AI enrichment."
