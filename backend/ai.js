const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load strict taxonomy
const taxonomyPath = path.join(__dirname, 'config', 'taxonomy.json');
const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));

const SYSTEM_PROMPT = `You are an AI support ticket analysis assistant. Your job is to process customer support tickets and output structured, analyzable data for a demo analytics system.

Instructions:
1. Translate ticket to English if necessary.
2. Understand the core problem and resolution.
3. Assign a category, subcategory, and root cause FROM THE ALLOWED LISTS ONLY.
4. Provide a suggested action to prevent recurrence.
5. Assign an ideal resolution tier (Tier 1, 2, 3) FROM THE ALLOWED LISTS ONLY.
6. Estimate confidence score (1-10).
7. Identify if there is churn risk or upsell opportunity FROM THE ALLOWED LISTS ONLY.
8. Identify any feature requests.
9. Determine affected product area FROM THE ALLOWED LISTS ONLY.
10. For 'solution_summary', if no resolution is mentioned, use 'Resolution in progress; support is currently investigating.'
11. Style Guidelines: 
    - Summaries must be concise, professional, and dash-board ready (< 100 characters).
    - Omit conversational filler like "The customer says..." or "Support mentioned...".
    - Use technical, precise language relevant to IoT and Factbird hardware.
12. Data Extraction:
    - stakeholders: (array of objects) [{ "name": "...", "role": "..." }] found in the text.
    - device_ids: (array of strings) Any hardware IDs or serial numbers mentioned (e.g., 84ed36fd32882301).
    - notes: (string) Any extra technical context not captured elsewhere.
13. Taxonomy Enforcement:
    - Ensure 'issue_subcategory' is logically consistent with the chosen 'issue_category'.
    - 'subcategories' like 'Offline Sensor' or 'Gateway Connectivity' ONLY belong in 'Sensor Connectivity'.
    - 'subcategories' like 'Duo Setup' or 'Installation Help' ONLY belong in 'Device Configuration'.
14. Before providing the final JSON, perform a quiet 'reasoning' step where you explain your logic for the category and root cause.
15. Always return valid JSON only, no explanations.

Strictly Allowed Values:
- Issue Categories: ${taxonomy.categories.join(', ')}
- Subcategories: ${taxonomy.subcategories.join(', ')}
- Root Causes: ${taxonomy.root_causes.join(', ')}
- Severity: ${taxonomy.severities.join(', ')}
- Resolution Tiers: ${taxonomy.tiers.join(', ')}
- Product Areas: ${taxonomy.product_areas.join(', ')}
- Churn Risk: ${taxonomy.churn_risks.join(', ')}
- Upsell Opp: ${taxonomy.upsell_opportunities.join(', ')}
- Resolution Type: ${taxonomy.resolution_types.join(', ')}

Required JSON fields (all must be present):
{
  "problem_summary": "",
  "solution_summary": "",
  "company_name": "",
  "issue_category": "",
  "issue_subcategory": "",
  "root_cause": "",
  "suggested_action": "",
  "ideal_resolution_tier": "",
  "churn_risk": "",
  "upsell_opportunity": "",
  "severity": "",
  "feature_request": "",
  "product_area": "",
  "confidence_score": 0,
  "resolution_type": "",
  "stakeholders": [],
  "device_ids": [],
  "notes": "",
  "reasoning": ""
}
`;

const { spawnSync } = require('child_process');

const problemKeywords = [
    "can i", "cannot", "can't", "issue", "problem", "error", "failed", 
    "not working", "offline", "unable", "how do i", "is it possible",
    "broken", "missing", "won't", "stop"
];

/**
 * Detects the most relevant "problem" sentence from a list.
 */
function detectProblemSentence(sentences) {
    if (!sentences || sentences.length === 0) return "";
    
    // 1. Filter out sentences that look like signatures
    const cleanSentences = sentences.filter(s => {
        const trimmed = s.trim();
        if (trimmed.length < 5) return false;
        const lower = trimmed.toLowerCase();
        return !signaturePatterns.some(pattern => {
            if (typeof pattern === 'string') return lower.includes(pattern.toLowerCase());
            return pattern.test(trimmed);
        });
    });

    if (cleanSentences.length === 0) return "Not provided in import";

    // 2. Look for keywords in meaningful sentences (> 20 chars)
    for (const sentence of cleanSentences) {
        const trimmed = sentence.trim();
        if (trimmed.length < 20) continue;
        const lower = trimmed.toLowerCase();
        for (const keyword of problemKeywords) {
            if (lower.includes(keyword)) {
                return trimmed;
            }
        }
    }

    // 3. Fallback to first line if it's substantial (> 30 chars) even if flagged as signature
    if (cleanSentences.length === 0 && sentences.length > 0) {
        const first = sentences[0].trim();
        if (first.length > 30) return first;
    }

    // 4. Last fallback
    return cleanSentences.length > 0 ? cleanSentences[0].trim() : "No problem description provided";
}

const solutionKeywords = [
    "we have", "we reset", "we updated", "we configured", "we copied", 
    "we fixed", "please try", "please check", "issue resolved", 
    "problem resolved", "should work now", "sent", "reset", "fixed", "updated"
];

const signaturePatterns = [
    /^\s*best regards[.!?]*\s*$/i, /^\s*thanks[.!?]*\s*$/i, /^\s*regards[.!?]*\s*$/i, /mobile:/i, /linkedin/i, 
    /book a meeting/i, /confidential - company proprietary/i,
    /senior enterprise/i, /account manager/i, /\+1 \d{3}/,
    /high street court/i, /morristown/i, /suite \d+/i, /factbird inc/i,
    /salman/i, /nj \d{5}/i, /usa\s*$/i, /www\./i, /1 high street/i,
    /superuser in\s*$/i, /Functional Devices\s*$/i // Only if it's at the end of the line (signature style)
];

/**
 * Detects Category based on keywords
 */
function detectProblemCategory(text) {
    const p = text.toLowerCase();
    if (p.includes("sensor") || p.includes("offline") || p.includes("gateway")) return "Sensor Connectivity";
    if (p.includes("duo") || p.includes("install") || p.includes("setup")) return "Device Configuration";
    if (p.includes("password") || p.includes("login") || p.includes("reset")) return "Account Access";
    if (p.includes("activity") || p.includes("stop cause") || p.includes("id") || p.includes("site")) return "Platform Configuration";
    return "General Support";
}

/**
 * Maps problem category to a descriptive root cause (User Strategy)
 */
function detectRootCauseIntent(category) {
    const causes = {
        "Sensor Connectivity": "Device connectivity issue affecting the sensor or gateway.",
        "Device Configuration": "Customer required assistance configuring hardware setup.",
        "Account Access": "Customer needed help accessing the system account.",
        "Platform Configuration": "Customer required assistance configuring system settings.",
        "General Support": "Customer requested assistance with the platform."
    };
    return causes[category] || "Customer required assistance with system configuration.";
}

/**
 * Calculates severity based on user-provided impact keywords
 */
function detectSeverityLevel(text) {
    const p = text.toLowerCase();
    if (p.includes("offline") || p.includes("not working")) return "high";
    if (p.includes("cannot") || p.includes("unable")) return "medium";
    return "low";
}

/**
 * Maps category to Product Area (User Strategy)
 */
function detectProductArea(category) {
    if (category === "Sensor Connectivity" || category === "Device Configuration") return "IoT & Hardware";
    if (category === "Platform Configuration") return "Production System";
    if (category === "Account Access") return "Cloud Platform";
    return "General Platform";
}
function extractSolutionSentence(sentences) {
    for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        for (const keyword of solutionKeywords) {
            if (lower.includes(keyword)) {
                return sentence.trim();
            }
        }
    }
    return "Support responded and assisted the customer.";
}

/**
 * Converts a solution sentence into a professional action-oriented summary
 */
function generateSolutionSummary(text) {
    if (!text || text.length < 5) return "Resolution in progress; support is currently investigating.";
    const s = text.toLowerCase();
    
    // Composite Intent: Reset + Email (Ticket #60)
    if (s.includes("reset") && s.includes("email")) {
        return "Support clarified the password reset process and the email address associated with the reset request.";
    }
    
    if (s.includes("reset")) {
        return "Support assisted the customer with resetting the account access code.";
    }
    if (s.includes("email")) {
        return "Support clarified which email address the password reset would be sent to.";
    }
    if (s.includes("copied")) {
        return "Support copied the configuration to the new device.";
    }
    if (s.includes("fixed") || s.includes("resolved") || s.includes("work now") || s.includes("online now") || s.includes("connected") || s.includes("back up")) {
        return "Support resolved the issue and confirmed the system is functioning normally.";
    }

    return "Resolution in progress; support is currently investigating.";
}

/**
 * Calculates a dynamic confidence score based on text quality
 */
function calculateConfidence(problem, solution) {
    let score = 5;
    if (problem && problem.length > 20) score += 1;
    if (solution && solution.length > 20) score += 1;
    if (problem && (problem.toLowerCase().includes("reset") || problem.toLowerCase().includes("offline"))) score += 1;
    if (solution && solution.toLowerCase().includes("support")) score += 1;
    
    // Cap at 10
    return Math.min(score, 10);
}

/**
 * Normalizes the problem summary to be more professional (Action-Oriented)
 */
function cleanProblemSummary(sentence) {
    if (!sentence) return "";
    
    // 1. Strip redundant prefixes
    let cleaned = sentence.replace(/^(customer asked|summary|problem|issue|subject):[\s]*/gi, "").trim();
    
    // 2. Normalize conversational starters
    const lower = cleaned.toLowerCase();
    
    // Strip common filler
    cleaned = cleaned
        .replace(/^(actually|basically|essentially|i noticed that|i am writing to report that|i am reporting that|i'm writing to report that|i'm reporting that|i would like to report that|yes|no),?\s*/gi, "")
        .replace(/^the real issue is that\s+/i, "")
        .replace(/^the problem is that\s+/i, "")
        .trim();

    const lower2 = cleaned.toLowerCase();
    if (lower2.startsWith("is it possible") || lower2.startsWith("can you") || lower2.startsWith("can i")) {
        cleaned = cleaned
            .replace(/^is it possible( that)?( you can)?( help)?/i, "Customer requested assistance")
            .replace(/^can you (help|reset)/i, "Customer requested assistance $1")
            .replace(/^can you/i, "Customer requested assistance")
            .replace(/^can i/i, "Customer inquired about")
            .replace(/^how do i/i, "Customer inquired about")
            .replace(/^how can i/i, "Customer inquired about")
            .replace(/\bor\s+inform\s+us\s+which/gi, "and asked which")
            .replace(/\bor\s+inform\b/gi, "and asked")
            .replace(/, or /gi, " and ")
            .replace(/,\s*can you help/gi, " and requested assistance")
            .replace(/,\s*can you/gi, " and requested assistance");
    }

    // 3. Context-Specific Polishing (Ticket #64 Style)
    cleaned = cleaned
        .replace(/reset the code/gi, "resetting the account access code")
        .replace(/which email/gi, "which email address")
        .replace(/reset is sent to/gi, "reset link was sent to")
        .replace(/reset will be sent to/gi, "reset link would be sent to")
        .replace(/reset is being sent to/gi, "reset link was being sent to");

    // 4. Offline Report Normalization
    if (lower.includes("offline") && !lower.startsWith("customer reported")) {
        cleaned = cleaned
            .replace(/\[.*?\]\s*/g, "") // Strip [Factbird] etc
            .replace(/^(Pending request|Re|Fwd|FW|Subject):\s*/gi, "") // Extra safety
            .replace(/^(the|sensor|device|is|are)\s+/gi, "");
            
        if (cleaned.toLowerCase().includes("is offline") || cleaned.toLowerCase().includes("are offline")) {
            cleaned = cleaned.replace(/(.*?)\s+(is|are)\s+offline.*/i, "Customer reported that the $1 device is offline");
        } else {
            cleaned = cleaned.replace(/(.*)\s+offline.*/i, "Customer reported that the $1 device is offline");
        }
        
        // Final cleanup of the re-written string
        cleaned = cleaned.replace(/reported that the (the|sensor|device)\s+/i, "reported that the ");
    }

    // 5. Final professional prefix if still missing
    const finalLower = cleaned.toLowerCase();
    const needsPrefix = !finalLower.startsWith("customer") && !finalLower.startsWith("support");
    
    if (needsPrefix) {
        if (finalLower.includes("online now") || finalLower.includes("closed") || finalLower.includes("resolved")) {
            cleaned = "Customer confirmed status update: " + cleaned;
        } else if (finalLower.includes("follow-up") || finalLower.includes("follow up")) {
            cleaned = "Customer followed up and " + cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
        } else {
            cleaned = "Customer requested assistance: " + cleaned;
        }
    }
    
    // Final professional cleanup
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    // Strip trailing metadata after hyphen or dash
    cleaned = cleaned
        .replace(/\?$/, ".")
        .replace(/\s*[\u2013\u2014-]\s*[A-Z].*(not provided.*)?$/i, "") 
        .replace(/:\s*Not provided in import.*/gi, "")
        .replace(/\.?\s*Not provided in import.*/gi, "");

    return cleaned.trim();
}
async function translateToEnglish(text) {
    if (!text || text.length < 5) return text;
    
    try {
        const pythonProcess = spawnSync('python3', [path.join(__dirname, 'translate.py')], {
            input: text,
            encoding: 'utf-8',
            timeout: 10000 
        });

        if (pythonProcess.status === 0 && pythonProcess.stdout) {
            const translated = pythonProcess.stdout.trim();
            if (translated && !translated.startsWith('Translation Error:')) {
                return translated;
            }
        }
    } catch (err) {
        console.error('Translation bridge failed:', err.message);
    }
    return text;
}

/**
 * Decodes literal \uXXXX unicode escape sequences (e.g., \u201d -> ”)
 */
function decodeUnicode(text) {
    if (!text) return "";
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });
}

const nlp = require('compromise');
const { decode } = require('html-entities');

/**
 * Safely parses JSON from LLM responses, cleaning markdown code blocks if present.
 */
function safeJsonParse(text) {
    if (!text) return null;
    try {
        // Remove markdown code blocks (e.g., ```json ... ```)
        const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error('Failed to parse LLM JSON:', e.message, '\nRaw text:', text);
        return null;
    }
}

/**
 * Advanced NLP processing without LLM
 */
async function processTicket(problem, solution, email) {
    // 0. Extract from complex Zendesk objects if provided
    let rawProblem = "";
    let rawSolution = "";

    function extractText(obj) {
        if (!obj) return "";
        
        // Recursive parsing for stringified JSON
        if (typeof obj === 'string') {
            const trimmed = obj.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return extractText(parsed);
                } catch (e) {
                    // Extreme stripping if parsing fails
                    return trimmed
                        .replace(/[\\"]*output[\\"]*:\s*{[\\"]*item_\d+[\\"]*:\s*[\\"]*/gi, '')
                        .replace(/[\\"]*output[\\"]*:\s*{[\\"]*/gi, '')
                        .replace(/[\\"]*item_\d+[\\"]*:\s*[\\"]*/gi, '')
                        .replace(/^[\[{\s"'\\]+/g, '')
                        .replace(/[\]}\s"'\\]+$/g, '')
                        .replace(/\\"/g, '"');
                }
            }
            return obj;
        }

        if (typeof obj === 'object') {
            // Priority: output.text > output.item_1 > first string value
            if (obj.output?.text) return extractText(obj.output.text);
            if (obj.output?.item_1) return extractText(obj.output.item_1);
            if (obj.text) return extractText(obj.text);
            
            const firstString = Object.values(obj).find(v => typeof v === 'string');
            if (firstString) return firstString;
            
            // If it's an object with no clear text field, look deeper
            const firstObj = Object.values(obj).find(v => typeof v === 'object' && v !== null);
            if (firstObj) return extractText(firstObj);
        }
        
        return String(obj);
    }

    rawProblem = extractText(problem);
    rawSolution = extractText(solution);

    // Load few-shot examples if available
    let fewShotContext = "";
    try {
        const goldPath = path.join(__dirname, 'config', 'gold_standard.json');
        if (fs.existsSync(goldPath)) {
            const gold = JSON.parse(fs.readFileSync(goldPath, 'utf8'));
            fewShotContext = "\n\nExamples of Perfect Processing:\n" + gold.map(g => 
                `Input: ${g.raw_text}\nOutput: ${JSON.stringify(g.ideal_output)}`
            ).join('\n\n');
        }
    } catch (e) {
        console.warn('Could not load gold standard examples:', e.message);
    }

    // 1. Cleaning Helper (As per User Requirements)
    function cleanTicket(text) {
        if (!text) return "";
        let cleaned = decodeUnicode(text);
        cleaned = decode(cleaned);
        
        // decode common html entities
        cleaned = cleaned.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

        // remove email headers
        cleaned = cleaned.replace(/From:.*|Date:.*|To:.*|Cc:.*|Subject:.*/gi, "");

        // remove email intros/follow-ups (Metadata)
        const introPatterns = [
            /this is a follow[- ]?up to your previous request #?\d+/gi,
            /this is a follow[- ]?up/gi,
            /re:.*?[.!?]/gi,
            /fw:.*?[.!?]/gi
        ];
        introPatterns.forEach(p => {
            cleaned = cleaned.replace(p, "");
        });
        
        // remove residual JSON markers (aggressive)
        cleaned = cleaned.replace(/\\?"output\\?":\s*{\\?/gi, "");
        cleaned = cleaned.replace(/\\?"item_\d+\\?":\s*/gi, "");
        cleaned = cleaned.replace(/[\\"]*output[\\"]*:\s*{/gi, "");
        cleaned = cleaned.replace(/[\{\}\[\]]/g, " "); // Strip ALL structural brackets
        cleaned = cleaned.replace(/\\"/g, '"');

        // surgical banner stripping before line split
        cleaned = cleaned.replace(/^Support\s*[\u2013\u2014-].*?[\u2013\u2014-]\s*superuser in\s+.*?(?=(cannot|is|has|wants|needs|asks|subject|issue|problem))/gi, "");
        cleaned = cleaned.replace(/^Support\s*[\u2013\u2014-].*?[\u2013\u2014-]\s*/gi, "");

        // Split into lines and find the signature cutoff
        const lines = cleaned.split(/\n/);
        const honestLines = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            const lower = trimmedLine.toLowerCase();
            const isSignature = signaturePatterns.some(pattern => {
                if (typeof pattern === 'string') return lower.includes(pattern.toLowerCase());
                return pattern.test(trimmedLine);
            });

            // If we hit a signature line, stop processing the rest of the email "tail"
            if (isSignature && honestLines.length > 0) break;
            if (isSignature) continue; // Skip header signatures if no content yet
            
            honestLines.push(trimmedLine);
        }

        let result = honestLines.join(" ");

        // final cleanup of URLs and emails
        result = result.replace(/https?:\/\/\S+/g, "");
        result = result.replace(/\S+@\S+\.\S+/g, "");
        
        return result.replace(/\s+/g, ' ').trim();
    }

    const cleanedProblem = cleanTicket(rawProblem);
    const cleanedSolution = cleanTicket(rawSolution);
    
    // 2. Translation Stage
    let textToAnalyze = (cleanedProblem + " " + cleanedSolution).trim();
    textToAnalyze = await translateToEnglish(textToAnalyze);
    
    // Post-Translation Cleanup
    let combinedText = textToAnalyze.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    combinedText = combinedText.replace(/^(Hello again|Happy New Year|Greetings|Hi there|Dear)[!.,\s]*/gi, "");

    const groqKey = process.env.GROQ_API_KEY;
    const groqBase = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
    const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-specdec';

    const xaiKey = process.env.XAI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY; 
    const openaiBase = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    const openaiModel = process.env.AI_MODEL || 'gpt-4o-mini';

    // 1. Try Groq first if configured
    if (groqKey && groqKey !== 'your_groq_api_key_here') {
        try {
            console.log(`[DEBUG] Attempting Groq call (Model: ${groqModel})`);
            const response = await axios.post(`${groqBase}/chat/completions`, {
                model: groqModel,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Support Ticket:\nProblem: ${cleanedProblem}\nSolution: ${cleanedSolution}\nCustomer Email: ${email}${fewShotContext}` }
                ],
                temperature: 0
            }, {
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.choices && response.data.choices[0].message.content) {
                const parsed = safeJsonParse(response.data.choices[0].message.content);
                if (parsed) {
                    console.log('[DEBUG] Groq Success');
                    return parsed;
                }
            }
        } catch (error) {
            console.error('Groq API call failed:', error.response ? JSON.stringify(error.response.data) : error.message);
        }
    }

    // 2. Try Grok (xAI) second if configured
    if (xaiKey && xaiKey !== 'your_xai_api_key_here') {
        try {
            console.log(`[DEBUG] Attempting Grok call (Model: ${xaiModel})`);
            const response = await axios.post(`${xaiBase}/chat/completions`, {
                model: xaiModel,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Support Ticket:\nProblem: ${cleanedProblem}\nSolution: ${cleanedSolution}\nCustomer Email: ${email}${fewShotContext}` }
                ],
                temperature: 0
            }, {
                headers: {
                    'Authorization': `Bearer ${xaiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.choices && response.data.choices[0].message.content) {
                const parsed = safeJsonParse(response.data.choices[0].message.content);
                if (parsed) {
                    console.log('[DEBUG] Grok Success');
                    return parsed;
                }
            }
        } catch (error) {
            console.error('Grok API call failed:', error.response ? JSON.stringify(error.response.data) : error.message);
        }
    }

    // 2. Try OpenAI second if configured
    if (openaiKey && openaiKey !== 'your_api_key_here') { 
        try {
            console.log(`[DEBUG] Attempting OpenAI call (Model: ${openaiModel})`);
            const response = await axios.post(`${openaiBase}/chat/completions`, {
                model: openaiModel,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Support Ticket:\nProblem: ${cleanedProblem}\nSolution: ${cleanedSolution}\nCustomer Email: ${email}${fewShotContext}` }
                ],
                temperature: 0
            }, {
                headers: {
                    'Authorization': `Bearer ${openaiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.choices && response.data.choices[0].message.content) {
                const parsed = safeJsonParse(response.data.choices[0].message.content);
                if (parsed) {
                    console.log('[DEBUG] OpenAI Success');
                    return parsed;
                }
            }
        } catch (error) {
            console.error('OpenAI API call failed:', error.response ? JSON.stringify(error.response.data) : error.message);
        }
    }

    // 3. Fallback to Local NLP Processing (Free & Safe)
    console.log('Using Intelligent Keyword Heuristics...');
    
    // B. Analyze with Compromise
    const doc = nlp(combinedText);
    const nouns = doc.nouns().out('array');
    const sentences = doc.sentences().out('array').map(s => s.trim().replace(/\s+/g, ' ')).filter(s => s.length > 0);
    
    // C. Extract Technical Details
    const techModels = doc.match('/[A-Z]{1,4}-?[0-9]{1,5}/').text(); 
    
    // D. Apply Specialized Mappings (User Requirements)
    const category = detectProblemCategory(combinedText);
    const level = detectSeverityLevel(combinedText);
    const rootCause = detectRootCauseIntent(category);
    const solSentence = extractSolutionSentence(sentences);
    const solSummary = generateSolutionSummary(solSentence);
    const productArea = detectProductArea(category);

    // E. Extract Company from Email Domain
    let companyName = "Unknown";
    if (email && email.includes('@')) {
        const domain = email.split("@")[1];
        companyName = domain.split(".")[0];
        companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
    }

    // F. Resolution Type
    let resType = "Unknown"; // Default to Unknown if we can't be sure
    if (combinedText.toLowerCase().includes('fixed itself') || combinedText.toLowerCase().includes('online now')) {
        resType = "Self Resolved";
    } else if (combinedText.toLowerCase().includes('we have') || combinedText.toLowerCase().includes('fixed')) {
        resType = "Support Fix";
    }

    // G. Churn Risk & Upsell Detection
    let churnRisk = "No";
    if (combinedText.toLowerCase().match(/cancel|stop|leaving|frustrated|poor service|not happy|leaving/i)) {
        churnRisk = "Yes";
    }

    let upsellOpp = "No";
    if (combinedText.toLowerCase().match(/more sensors|upgrade|additional|new site|pricing|buying|purchase/i)) {
        upsellOpp = "Yes";
    }

    // Final Polish
    const problemSentence = detectProblemSentence(sentences);
    const finalProblem = problemSentence || (sentences[0] || combinedText.substring(0, 60));

    // H. Dynamic Confidence Score
    const confidence = calculateConfidence(finalProblem, solSummary);

    const cleanResult = (str) => {
        if (!str) return "";
        return str
            .replace(/\\n/g, ' ')  // Strip literal \n strings
            .replace(/\r\n/g, ' ') // Strip CRLF
            .replace(/\n/g, ' ')   // Strip LF
            .replace(/^["']|["']$/g, '') 
            .replace(/^(Re|Fwd|FW|Subject|Pending request):\s*/gi, "")
            .replace(/\[.*?\]\s*/g, "") 
            .replace(/\s+/g, ' ')
            .trim();
    };

    const cleanNouns = nouns
        .filter(n => n.length > 2)
        .filter(n => !/new year|hello|hej|hi|dear|greetings|thanks|regards/i.test(n))
        .filter(n => !/[!?,.;:]/.test(n));

    // G. Intelligent Suggested Action
    let suggestedAction = "Provide clearer instructions and ensure the resolution process is easy to follow.";
    if (category === "Account Access") {
        suggestedAction = "Provide clearer password reset instructions and ensure reset emails are easy to identify.";
    } else if (category === "Sensor Connectivity") {
        suggestedAction = "Check device network connection, power status, and gateway connectivity.";
    } else if (category === "Device Configuration") {
        suggestedAction = "Ensure the installation guide is up to date and provided during onboarding.";
    } else if (category === "Platform Configuration") {
        suggestedAction = "Consult site configuration settings and verify ID mappings.";
    }

    return {
        "problem_summary": cleanProblemSummary(cleanResult(finalProblem)),
        "solution_summary": cleanResult(solSummary),
        "company_name": companyName,
        "issue_category": category,
        "issue_subcategory": (techModels || (cleanNouns[0] || "General Support")).replace(/\s*-\s*.*$/, "").trim(),
        "root_cause": rootCause,
        "suggested_action": suggestedAction,
        "ideal_resolution_tier": level === "high" ? "Tier 2" : (level === "critical" ? "Tier 3" : "Tier 1"),
        "churn_risk": churnRisk,
        "upsell_opportunity": upsellOpp,
        "severity": level,
        "feature_request": "None",
        "product_area": productArea,
        "confidence_score": confidence, 
        "resolution_type": resType
    };
}

module.exports = { processTicket };
