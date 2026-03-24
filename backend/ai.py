import os
try:
    from google import genai # type: ignore
    from google.genai import types # type: ignore
except ImportError:
    pass
import json
import re
import subprocess
from pathlib import Path
from html import unescape
import requests  # pyre-ignore
from dotenv import load_dotenv  # pyre-ignore

load_dotenv(dotenv_path=Path(__file__).parent / '.env')

# In-memory cache to prevent redundant AI calls in the same session
_AI_CACHE = {}

# Load taxonomy
taxonomy_path = Path(__file__).parent / 'config' / 'taxonomy.json'
with open(taxonomy_path, 'r', encoding='utf-8') as f:
    taxonomy = json.load(f)

# Map known legacy/old category names → current taxonomy values
CATEGORY_ALIASES = {
    'platform configuration': 'Production Line Configuration (manual line, virtual device, line modeling)',
    'sensor connectivity': 'Sensors & PLC Connectivity (PLCs, Kepware, wiring, signal ingestion)',
    'sensor / hardware connectivity': 'Sensors & PLC Connectivity (PLCs, Kepware, wiring, signal ingestion)',
    'sensor & plc connectivity': 'Sensors & PLC Connectivity (PLCs, Kepware, wiring, signal ingestion)',
    'sensors & plc connectivity': 'Sensors & PLC Connectivity (PLCs, Kepware, wiring, signal ingestion)',
    'device configuration': 'Devices & Edge Hardware (EDGE/DUO/physical device issues)',
    'device connectivity': 'Sensors & PLC Connectivity (PLCs, Kepware, wiring, signal ingestion)',
    'hardware / device setup': 'Devices & Edge Hardware (EDGE/DUO/physical device issues)',
    'general support': 'Reliability & Performance (errors, outages, system performance, migration)',
    'other': 'Reliability & Performance (errors, outages, system performance, migration)',
    'account access': 'Access & User Management (login, permissions, orgs)',
    'authentication': 'Access & User Management (login, permissions, orgs)',
    'network & connectivity': 'Network & Data Transfer (wifi/cellular/certs/transferring data)',
    'performance': 'Reliability & Performance (errors, outages, system performance, migration)',
    'ui/ux problem': 'Operator Experience (Views) (operator view, day-to-day UI)',
    'account & subscription': 'Account & Subscription (Billing)',
    'uncategorized': 'Reliability & Performance (errors, outages, system performance, migration)',
    'unknown': 'Reliability & Performance (errors, outages, system performance, migration)',
    'general platform': 'Reliability & Performance (errors, outages, system performance, migration)',
}

COMPANY_ALIASES = {
    'novo': 'Novo Nordisk',
    'novo departments': 'Novo Nordisk'
}


def _normalize_for_match(s):
    """Normalize a string for fuzzy taxonomy comparison."""
    s = str(s).lower().strip()
    # Normalize & ↔ and so "Network and Data Transfer" matches "Network & Data Transfer"
    s = re.sub(r'\s*&\s*', ' and ', s)
    s = re.sub(r'\band\b', 'and', s)
    # Strip parenthetical descriptions so "Network & Data Transfer (wifi/...)" → "network and data transfer"
    s = re.sub(r'\s*\(.*?\)', '', s).strip()
    # Collapse extra spaces
    s = re.sub(r'\s+', ' ', s)
    return s


def force_taxonomy_match(field_name, value):
    """Ensures that the given value matches a taxonomy entry using robust multi-tier matching."""
    mapping = {
        "issue_category": "categories",
        "issue_subcategory": "subcategories",
        "root_cause": "root_causes",
        "severity": "severities",
        "churn_risk": "churn_risks",
        "resolution_type": "resolution_types",
        "company_name": "companies"
    }

    taxonomy_key = mapping.get(field_name)
    if not taxonomy_key or taxonomy_key not in taxonomy:
        return value

    valid_options = taxonomy[taxonomy_key]

    # 0. Alias map — resolve known legacy names to current taxonomy values (must happen first)
    if taxonomy_key == 'categories':
        val_alias_key = str(value).lower().strip()
        if val_alias_key in CATEGORY_ALIASES:
            return CATEGORY_ALIASES[val_alias_key]
    
    if taxonomy_key == 'companies':
        val_alias_key = str(value).lower().strip()
        if val_alias_key in COMPANY_ALIASES:
            return COMPANY_ALIASES[val_alias_key]

    # 1. Exact match (fast path)
    if value in valid_options:
        return value

    # 2. Case-insensitive exact match
    val_lower = str(value).lower().strip()
    for opt in valid_options:
        if opt.lower() == val_lower:
            return opt

    # 3. Normalized match — strips parentheticals, normalises & vs and
    val_norm = _normalize_for_match(value)
    for opt in valid_options:
        opt_norm = _normalize_for_match(opt)
        if val_norm == opt_norm:
            return opt

    # 4. Starts-with match on normalized base (handles LLM adding/omitting descriptions)
    for opt in valid_options:
        opt_norm = _normalize_for_match(opt)
        if opt_norm.startswith(val_norm) or val_norm.startswith(opt_norm):
            return opt

    # 5. Key-word overlap — count shared significant words
    val_words = set(val_norm.split()) - {'the', 'a', 'an', 'of', 'for', 'in', 'and', 'or', 'to'}
    best_opt, best_score = None, 0
    for opt in valid_options:
        opt_words = set(_normalize_for_match(opt).split()) - {'the', 'a', 'an', 'of', 'for', 'in', 'and', 'or', 'to'}
        overlap = len(val_words & opt_words)
        if overlap > best_score:
            best_score = overlap
            best_opt = opt
    if best_score >= 2:
        return best_opt

    # 6. Substring partial match (original logic as last resort)
    for opt in valid_options:
        if opt.lower() in val_lower or val_lower in opt.lower():
            return opt

    # 7. Default fallback
    defaults = {
        "categories": "Reliability & Performance (errors, outages, system performance, migration)",
        "subcategories": "Site Configuration",
        "root_causes": "Infrastructure Issue",
        "severities": "low",
        "churn_risks": "No",
        "resolution_types": "No Action Needed"
    }
    return defaults.get(str(taxonomy_key), value)

SYSTEM_PROMPT = f"""You are a senior Zendesk support intelligence analyst with 10 years of experience.
Your task is to deeply analyze customer Zendesk support ticket conversations and produce ACCURATE, DETAILED, and EXPLAINABLE structured output.

═══════════════════════════════════════════════════════════════
THINKING PROCESS (Chain of Thought):
═══════════════════════════════════════════════════════════════
Before generating the JSON, you MUST internally follow these steps:
1. Technical Audit: Identify the core technical failure (e.g., PLC timeout, firmware regression, API 401).
2. Resolution Mapping: Trace exactly what support changed or found.
3. Taxonomy Alignment: Select the most precise Category and Root Cause from the provided list.
4. Confidence Weighting: Deduct points for ambiguity, missing info, or generic email domains.

═══════════════════════════════════════════════════════════════
CRITICAL ANALYSIS RULES — FOLLOW EVERY ONE WITHOUT EXCEPTION:
═══════════════════════════════════════════════════════════════

RULE 1 — READ THE ENTIRE CONVERSATION:
  - Never base your analysis only on the first customer message.
  - Read EVERY message — the situation often CHANGES as the conversation evolves.

RULE 2 — TECHNICAL PROBLEM SUMMARY (NO GENERIC TERMS):
  - problem_summary must be specific and technical.
  - WRONG: "Customer has a sensor issue."
  - RIGHT: "Factbird DUO device reporting 'Intermittent Offline' status on Line 4 since firmware v2.1 update."

RULE 3 — TECHNICAL SOLUTION SUMMARY (NO GENERIC TERMS):
  - solution_summary must describe the EXACT technical fix or discovery.
  - WRONG: "Support fixed the issue."
  - RIGHT: "Reconfigured Kepware MQTT tags, updated gateway address to 10.0.x.x, and verified signal flow in Operator View."
  - Include error codes, specific hardware IDs, and exact steps taken.

RULE 4 — ACCURATE ROOT CAUSE:
  - Identify the UNDERLYING cause, not the symptom.
  - "Device offline" is a symptom. "Unstable factory WiFi" is the root cause.

RULE 5 — RIGOROUS CONFIDENCE SCORING (STRICT GUARDRAILS):
  - 90–100%: Total certainty. Explicit confirmation of fix and clear company identity.
  - 70–89%: High certainty, but missing one secondary detail.
  - BELOW 70% (CRITICAL FLAG):
    * HARD CAP (MAX 65%): If Company Name is "Unknown" or generic (gmail/outlook domain).
    * HARD CAP (MAX 60%): If the solution is "Investigating" or "Pending customer reply".
    * HARD CAP (MAX 50%): If the conversation is highly ambiguous or contradictions exist.
  - Your score MUST signal to the human reviewer if the data is shaky.

RULE 6 — COMPANY NAME (CRITICAL):
  - Factbird is the provider, NOT the customer. NEVER use "Factbird".
  - Extract the CUSTOMER's company from domain or text (e.g., Novo Nordisk, Arla, etc.).

RULE 7 — EXPLAINABILITY:
  - The `reasoning` field must explain WHY you chose the category and HOW you calculated the confidence score.

RULE 8 — STRATEGIC ROADMAP (FOR VAGUE DATA):
  - If the conversation ends without a clear fix, you MUST extrapolate a **Professional Strategic Roadmap**.
  - Based on the core technical problem, describe the 'Best Practice' resolution steps (e.g., "Verification of MQTT endpoint stability, checking signal-to-noise ratio, and whitelisting IP 10.x.x.x").
  - NEVER use phrases like "No solution mentioned", "Not provided", or "Investigating".
  - Every `solution_summary` must be a high-value, prescriptive instruction set.

═══════════════════════════════════════════════════════════════
TAXONOMY — USE ONLY THESE VALUES:
═══════════════════════════════════════════════════════════════
- Issue Categories: {', '.join(taxonomy['categories'])}
- Subcategories: {', '.join(taxonomy['subcategories'])}
- Root Causes: {', '.join(taxonomy['root_causes'])}
- Severity: {', '.join(taxonomy['severities'])}
- Resolution Type: {', '.join(taxonomy['resolution_types'])}

REQUIRED JSON OUTPUT:
{{
  "problem_summary": "Highly technical summary of reported issue",
  "solution_summary": "Highly technical summary of fix/discovery",
  "company_name": "Customer Business Name",
  "issue_category": "Taxonomy Category",
  "issue_subcategory": "Taxonomy Subcategory",
  "root_cause": "Taxonomy Root Cause",
  "severity": "low/medium/high/critical",
  "confidence_score": 0,
  "reasoning": "Explain the technical logic and how you reached the confidence score",
  "resolution_type": "Taxonomy Resolution Type"
}}
"""

PROBLEM_KEYWORDS = [
    "can i", "cannot", "can't", "issue", "problem", "error", "failed",
    "not working", "offline", "unable", "how do i", "is it possible",
    "broken", "missing", "won't", "stop"
]

SOLUTION_KEYWORDS = [
    "we have", "we reset", "we updated", "we configured", "we copied",
    "we fixed", "please try", "please check", "issue resolved",
    "problem resolved", "should work now", "sent", "reset", "fixed", "updated"
]

SIGNATURE_PATTERNS = [
    re.compile(r'^\s*best regards[.!?]*\s*$', re.I),
    re.compile(r'^\s*thanks[.!?]*\s*$', re.I),
    re.compile(r'^\s*regards[.!?]*\s*$', re.I),
    re.compile(r'mobile:', re.I),
    re.compile(r'linkedin', re.I),
    re.compile(r'book a meeting', re.I),
    re.compile(r'confidential - company proprietary', re.I),
    re.compile(r'senior enterprise', re.I),
    re.compile(r'account manager', re.I),
    re.compile(r'\+1 \d{3}'),
    re.compile(r'\+45 \d{4}'),
    re.compile(r'\+\d{2} \d{4}'),
    re.compile(r'high street court', re.I),
    re.compile(r'morristown', re.I),
    re.compile(r'suite \d+', re.I),
    re.compile(r'factbird inc', re.I),
    re.compile(r'salman', re.I),
    re.compile(r'nj \d{5}', re.I),
    re.compile(r'usa\s*$', re.I),
    re.compile(r'www\.', re.I),
    re.compile(r'1 high street', re.I),
    re.compile(r'superuser in\s*$', re.I),
    re.compile(r'Functional Devices\s*$'),
]


def _is_signature(line):
    lower = line.lower()
    for pat in SIGNATURE_PATTERNS:
        if pat.search(line):
            return True
    return False


def decode_unicode(text):
    if not text:
        return ""
    return re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), text)


def detect_problem_category(text):
    p = text.lower()
    if 'billing' in p or 'subscription' in p or 'invoice' in p:
        return 'Account & Subscription (Billing)'
    if 'password' in p or 'login' in p or 'permissions' in p:
        return 'Access & User Management (login, permissions, orgs)'
    if 'onboarding' in p or 'setup' in p or 'rollout' in p:
        return 'Onboarding & Setup (initial rollout, configuration help)'
    if 'edge' in p or 'duo' in p or 'hardware' in p:
        return 'Devices & Edge Hardware (EDGE/DUO/physical device issues)'
    if 'plc' in p or 'sensor' in p or 'signal' in p:
        return 'Sensors & PLC Connectivity (PLCs, Kepware, wiring, signal ingestion)'
    if 'wifi' in p or 'cellular' in p or 'network' in p:
        return 'Network & Data Transfer (wifi/cellular/certs/transferring data)'
    if 'production line' in p or 'line modeling' in p:
        return 'Production Line Configuration (manual line, virtual device, line modeling)'
    if 'stop' in p or 'activity' in p:
        return 'Stops, Events & Activities (stop causes, activities)'
    if 'batch' in p or 'recipe' in p:
        return 'Batches & Recipes (batches, control recipe, golden batch)'
    if 'oee' in p or 'kpi' in p:
        return 'OEE & KPIs (calculation logic, KPI definitions)'
    if 'operator' in p or 'view' in p:
        return 'Operator Experience (Views) (operator view, day-to-day UI)'
    if 'analytics' in p or 'trends' in p:
        return 'Analytics, Trends & Insights'
    if 'report' in p or 'bi export' in p:
        return 'Reports & BI Export (reports, Power BI, exports)'
    if 'api' in p or 'integration' in p or 'graphql' in p:
        return 'Integrations & API (GraphQL, API token, system integration, batch XML API)'
    if 'reliability' in p or 'outage' in p or 'performance' in p:
        return 'Reliability & Performance (errors, outages, system performance, migration)'
    return 'Reliability & Performance (errors, outages, system performance, migration)'


def detect_root_cause_intent(combined_text):
    p = combined_text.lower()
    if 'bug' in p or 'error' in p:
        return 'Product Bug'
    if 'confus' in p or 'how to' in p:
        return 'UX Design Confusion'
    if 'missing' in p or 'request' in p:
        return 'Missing Capability'
    if 'permission' in p or 'login' in p:
        return 'Permissions Design Gap'
    if 'wifi' in p or 'cellular' in p or 'offline' in p:
        return 'Infrastructure Issue'
    if 'wrong' in p or 'error' in p:
        return 'User Error'
    return 'Configuration Complexity'


def detect_severity_level(text):
    p = text.lower()
    if 'critical' in p or 'emergency' in p or 'data loss' in p:
        return 'critical'
    if 'offline' in p or 'not working' in p or 'high' in p:
        return 'high'
    if 'cannot' in p or 'unable' in p or 'medium' in p:
        return 'medium'
    return 'low'


def extract_solution_sentence(sentences: list[str]) -> str:
    for sentence in sentences:
        lower = sentence.lower()
        for kw in SOLUTION_KEYWORDS:
            if kw in lower:
                return sentence.strip()
    return "Initial diagnostics performed; strategic roadmap includes verifying network credentials and performing a hardware power cycle."


def generate_solution_summary(text):
    if not text or len(text) < 5:
        return "Analyze signal-to-noise ratio and verify gateway MQTT endpoint connectivity."
    s = text.lower()
    if 'reset' in s and 'email' in s:
        return "Support clarified the account recovery process and verified the destination email for security credentials."
    if 'reset' in s:
        return "Support performed a secure reset of the account access code and verified connectivity."
    if 'email' in s:
        return "Support verified the primary communication channel and confirmed security update delivery."
    if 'copied' in s:
        return "Support synchronized the system configuration onto the target hardware for deployment."
    if any(kw in s for kw in ('fixed', 'resolved', 'work now', 'online now', 'connected', 'back up')):
        return "Support confirmed successful service restoration and verified all system metrics are within operational bounds."
    return "Execute a comprehensive system diagnostic to identify edge-case latencies and verify hardware authentication."


def calculate_confidence(problem, solution):
    score = 50
    if problem and len(problem) > 20:
        score += 10
    if solution and len(solution) > 20:
        score += 10
    if problem:
        pl = problem.lower()
        if 'reset' in pl or 'offline' in pl:
            score += 10
    if solution and 'support' in solution.lower():
        score += 10
    return min(score, 100)


def detect_problem_sentence(sentences):
    if not sentences:
        return ""
    clean = [s.strip() for s in sentences if len(s.strip()) >= 5 and not _is_signature(s.strip())]
    if not clean:
        return None
    for s in clean:
        if len(s) < 20:
            continue
        lower = s.lower()
        for kw in PROBLEM_KEYWORDS:
            if kw in lower:
                return s
    return clean[0] if clean else "No problem description provided"


def clean_problem_summary(sentence):
    if not sentence:
        return ""
    cleaned = re.sub(r'^(customer asked|summary|problem|issue|subject):\s*', '', sentence, flags=re.I).strip()
    cleaned = re.sub(
        r'^(actually|basically|essentially|i noticed that|i am writing to report that|i am reporting that|'
        r"i'm writing to report that|i'm reporting that|i would like to report that|yes|no),?\s*", '',
        cleaned, flags=re.I
    ).strip()
    cleaned = re.sub(r'^the real issue is that\s+', '', cleaned, flags=re.I).strip()
    cleaned = re.sub(r'^the problem is that\s+', '', cleaned, flags=re.I).strip()

    lower2 = cleaned.lower()
    if lower2.startswith('is it possible') or lower2.startswith('can you') or lower2.startswith('can i'):
        cleaned = re.sub(r'^is it possible( that)?( you can)?( help)?', 'Customer requested assistance', cleaned, flags=re.I)
        cleaned = re.sub(r'^can you (help|reset)', r'Customer requested assistance \1', cleaned, flags=re.I)
        cleaned = re.sub(r'^can you', 'Customer requested assistance', cleaned, flags=re.I)
        cleaned = re.sub(r'^can i', 'Customer inquired about', cleaned, flags=re.I)
        cleaned = re.sub(r'^how do i', 'Customer inquired about', cleaned, flags=re.I)
        cleaned = re.sub(r'^how can i', 'Customer inquired about', cleaned, flags=re.I)
        cleaned = re.sub(r'\bor\s+inform\s+us\s+which', 'and asked which', cleaned, flags=re.I)
        cleaned = re.sub(r'\bor\s+inform\b', 'and asked', cleaned, flags=re.I)
        cleaned = re.sub(r', or ', ' and ', cleaned, flags=re.I)
        cleaned = re.sub(r',\s*can you help', ' and requested assistance', cleaned, flags=re.I)
        cleaned = re.sub(r',\s*can you', ' and requested assistance', cleaned, flags=re.I)

    cleaned = re.sub(r'reset the code', 'resetting the account access code', cleaned, flags=re.I)
    cleaned = re.sub(r'which email', 'which email address', cleaned, flags=re.I)
    cleaned = re.sub(r'reset is sent to', 'reset link was sent to', cleaned, flags=re.I)
    cleaned = re.sub(r'reset will be sent to', 'reset link would be sent to', cleaned, flags=re.I)
    cleaned = re.sub(r'reset is being sent to', 'reset link was being sent to', cleaned, flags=re.I)

    lower = cleaned.lower()
    if 'offline' in lower and not lower.startswith('customer reported'):
        cleaned = re.sub(r'\[.*?\]\s*', '', cleaned)
        cleaned = re.sub(r'^(Pending request|Re|Fwd|FW|Subject):\s*', '', cleaned, flags=re.I)
        cleaned = re.sub(r'^(the|sensor|device|is|are)\s+', '', cleaned, flags=re.I)
        if 'is offline' in cleaned.lower() or 'are offline' in cleaned.lower():
            cleaned = re.sub(r'(.*?)\s+(is|are)\s+offline.*', r'Customer reported that the \1 device is offline', cleaned, flags=re.I)
        else:
            cleaned = re.sub(r'(.*)\s+offline.*', r'Customer reported that the \1 device is offline', cleaned, flags=re.I)
        cleaned = re.sub(r'reported that the (the|sensor|device)\s+', 'reported that the ', cleaned, flags=re.I)

    final_lower = cleaned.lower()
    needs_prefix = not final_lower.startswith('customer') and not final_lower.startswith('support')
    if needs_prefix:
        if any(kw in final_lower for kw in ('online now', 'closed', 'resolved')):
            cleaned = 'Customer confirmed status update: ' + cleaned
        elif 'follow-up' in final_lower or 'follow up' in final_lower:
            cleaned = 'Customer followed up and ' + cleaned[0].lower() + cleaned[1:]  # pyre-ignore
        else:
            cleaned = 'Customer requested assistance: ' + cleaned

    if cleaned:
        cleaned = cleaned[0].upper() + cleaned[1:]  # pyre-ignore

    cleaned = re.sub(r'\?$', '.', cleaned)
    cleaned = re.sub(r'\s*[\u2013\u2014\-]\s*[A-Z].*(not provided.*)?$', '', cleaned, flags=re.I)
    cleaned = re.sub(r':\s*Not provided in import.*', '', cleaned, flags=re.I)
    cleaned = re.sub(r'\.?\s*Not provided in import.*', '', cleaned, flags=re.I)

    if cleaned.lower() == 'customer requested assistance: not provided in import':
        return 'Not provided in import.'

    return cleaned.strip()


def extract_text(obj):
    if obj is None:
        return ""
    if isinstance(obj, str):
        trimmed = obj.strip()
        if trimmed.startswith('{') or trimmed.startswith('['):
            try:
                parsed = json.loads(trimmed)
                return extract_text(parsed)
            except Exception:
                result = re.sub(r'[\\"]?output[\\"]?:\s*\{[\\"]?', '', trimmed, flags=re.I)
                result = re.sub(r'[\\"]?item_\d+[\\"]?:\s*[\\"]?', '', result, flags=re.I)
                result = re.sub(r'^[\[{\s"\'\\\\]+', '', result)
                result = re.sub(r'[\]}\s"\'\\\\]+$', '', result)
                result = result.replace('\\"', '"')
                return result
        return obj
    if isinstance(obj, list):
        return '\n\n'.join(filter(None, [extract_text(item) for item in obj]))
    if isinstance(obj, dict):
        item_keys = sorted([k for k in obj.keys() if k.lower().startswith('item_') or k.lower().startswith('item ')])
        if item_keys:
            parts = []
            for idx, k in enumerate(item_keys):
                role = 'Customer: ' if idx % 2 == 0 else 'Support: '
                # type: ignore
                parts.append(role + extract_text(obj[k]))
            return '\n\n'.join(parts)
        if 'output' in obj and isinstance(obj['output'], dict):
            out = obj['output']
            item_keys2 = sorted([k for k in out.keys() if k.lower().startswith('item_') or k.lower().startswith('item ')])
            if item_keys2:
                parts = []
                for idx, k in enumerate(item_keys2):
                    role = 'Customer: ' if idx % 2 == 0 else 'Support: '
                    # type: ignore
                    parts.append(role + extract_text(out[k]))
                return '\n\n'.join(parts)
            if 'text' in out:
                return extract_text(out['text'])
        if 'text' in obj:
            return extract_text(obj['text'])
        first_str = next((v for v in obj.values() if isinstance(v, str)), None)
        if first_str:
            return first_str
        first_obj = next((v for v in obj.values() if isinstance(v, dict)), None)
        if first_obj:
            return extract_text(first_obj)
    return str(obj)


def clean_ticket(text):
    if not text:
        return ""
    cleaned = decode_unicode(text)
    cleaned = unescape(cleaned)
    cleaned = cleaned.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    cleaned = re.sub(r'From:.*|Date:.*|To:.*|Cc:.*|Subject:.*', '', cleaned, flags=re.I)
    for pat in [
        r'this is a follow[- ]?up to your previous request #?\d+',
        r'this is a follow[- ]?up',
        r're:.*?[.!?]',
        r'fw:.*?[.!?]'
    ]:
        cleaned = re.sub(pat, '', cleaned, flags=re.I)

    cleaned = re.sub(r'[\\"]?output[\\"]?:\s*\{[\\"]?', '', cleaned, flags=re.I)
    cleaned = re.sub(r'[\\"]?item_\d+[\\"]?:\s*', '', cleaned, flags=re.I)
    cleaned = re.sub(r'[\\"]?output[\\"]?:\s*\{', '', cleaned, flags=re.I)
    cleaned = re.sub(r'[\{\}\[\]]', ' ', cleaned)
    cleaned = cleaned.replace('\\"', '"')

    cleaned = re.sub(
        r'^Support\s*[\u2013\u2014\-].*?[\u2013\u2014\-]\s*superuser in\s+.*?(?=(cannot|is|has|wants|needs|asks|subject|issue|problem))',
        '', cleaned, flags=re.I | re.S
    )
    cleaned = re.sub(r'^Support\s*[\u2013\u2014\-].*?[\u2013\u2014\-]\s*', '', cleaned, flags=re.I)

    cleaned = re.sub(
        r'(kind regards|best regards|regards,|thanks,|thank you,|med venlig hilsen|vh \/).*$',
        '', cleaned, flags=re.I | re.S
    )

    lines = cleaned.split('\n')
    honest_lines = []
    for line in lines:
        trimmed = line.strip()
        if not trimmed:
            continue
        if _is_signature(trimmed):
            if honest_lines:
                break
            continue
        # type: ignore
        honest_lines.append(trimmed)

    result = '\n'.join(honest_lines)
    result = re.sub(r'https?://\S+', '', result)
    result = re.sub(r'\S+@\S+\.\S+', '', result)
    return re.sub(r'\s+', ' ', result).strip()


def translate_to_english(text):
    if not text or not isinstance(text, str) or len(text) < 5:
        return text
    try:
        # Check if text is likely already English to skip sub-process overhead
        if re.search(r'\b(the|and|for|with|that|this|have|been)\b', text.lower()):
            print('[DEBUG] Skipping translation (already English)')
            return text
            
        print(f'[DEBUG] Translating text (Length: {len(text)} chars)...')
        translate_py = str(Path(__file__).parent / 'translate.py')
        proc = subprocess.run(
            ['python3', translate_py],
            input=text,
            capture_output=True,
            text=True,
            timeout=3
        )
        if proc.returncode == 0 and proc.stdout:
            translated = proc.stdout.strip()
            if translated and not translated.startswith('Translation Error:'):
                return translated
    except Exception as e:
        print(f'[Translation Warn] {e}')
    return text


def safe_json_parse(text: str):
    """Robustly extract and parse JSON from LLM output.
    Handles: markdown fences, leading/trailing text, partial wrapping, nested braces.
    """
    if not text:
        return None

    # Step 1: Strip markdown code fences
    stripped = re.sub(r'```(?:json)?\s*([\s\S]*?)```', r'\1', text).strip()

    # Step 2: Try direct parse first
    try:
        return json.loads(stripped)
    except Exception:
        pass

    # Step 3: Find outermost { ... } block (handles leading/trailing prose)
    start = stripped.find('{')
    if start != -1:
        # Walk backwards from end to find closing brace that balances
        depth = 0
        end = -1
        for i, ch in enumerate(stripped[start:], start=start):  # pyre-ignore
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    end = i
                    break
        if end != -1:
            candidate = stripped[start:end + 1]  # pyre-ignore
            try:
                return json.loads(candidate)
            except Exception:
                # Step 4: Attempt to fix common issues (trailing commas, single quotes)
                fixed = re.sub(r',\s*([}\]])', r'\1', candidate)   # trailing commas
                fixed = re.sub(r"(?<=[{,])\s*'([^']+)'\s*:", r'"\1":', fixed)  # single-quote keys
                try:
                    return json.loads(fixed)
                except Exception as e:
                    print(f'[WARN] JSON parse failed after fixes: {e}\nRaw excerpt: {candidate[:300]}')  # pyre-ignore

    print(f'[WARN] Could not extract JSON from LLM response:\n{text[:400]}')  # pyre-ignore
    return None


def _llm_call(base_url, api_key, model, system_prompt, user_content):
    response = requests.post(
        f'{base_url}/chat/completions',
        json={
            'model': model,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_content}
            ],
            'temperature': 0
        },
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        timeout=30
    )
    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        status = response.status_code
        if status == 429:
             print(f'[WARN] Rate limit hit (429) for {model}. Wait a minute or check your quota.')
        else:
             print(f'[ERROR] API {status} Error: {response.text[:500]}')
        raise e
        
    data = response.json()
    return data['choices'][0]['message']['content']


def process_ticket(problem, solution, email, mode='deep'):
    analysis_mode = str(mode).lower()

    raw_problem = extract_text(problem)
    raw_solution = extract_text(solution)

    # Load few-shot examples if available
    few_shot_context = ""
    gold_path = Path(__file__).parent / 'config' / 'gold_standard.json'
    if gold_path.exists():
        try:
            with open(gold_path, 'r', encoding='utf-8') as f:
                gold = json.load(f)
            few_shot_context = "\n\nExamples of Perfect Processing:\n" + "\n\n".join(
                f"Input: {g['raw_text']}\nOutput: {json.dumps(g['ideal_output'])}" for g in gold
            )
        except Exception as e:
            print(f'Could not load gold standard examples: {e}')

    cleaned_problem = clean_ticket(raw_problem)
    cleaned_solution = clean_ticket(raw_solution)

    has_role_markers = bool(re.search(r'\b(Customer:|Support:|Agent:)', cleaned_problem, re.I))
    if not has_role_markers and cleaned_problem and cleaned_solution and cleaned_solution.strip():
        text_to_analyze = f"Customer: {cleaned_problem}\n\nSupport Agent: {cleaned_solution}"
    else:
        text_to_analyze = (cleaned_problem + ('\n\n' + cleaned_solution if cleaned_solution else '')).strip()

    text_to_analyze = translate_to_english(text_to_analyze)

    combined_text: str = text_to_analyze.replace('\r\n', '\n').strip()
    combined_text = re.sub(r'^(Hello again|Happy New Year|Greetings|Hi there|Dear)[!.,\s]*', '', combined_text, flags=re.I)
    
    print(f'[DEBUG] Word count after cleaning: {len(combined_text.split())}')

    # --- CACHE CHECK ---
    # Use a safe slice for the log message to satisfy type checkers
    preview = str(combined_text)[:50] if combined_text else "" # type: ignore
    cache_key = f"{combined_text}_{email}_{analysis_mode}"
    if cache_key in _AI_CACHE:
        print(f"[DEBUG] Internal Cache Hit for: {preview}... ✅")
        return _AI_CACHE[cache_key]

    # The system will now automatically try LLMs first and fallback to heuristics if they fail.

    user_content = f"Support Ticket (full conversation, pre-translated to English):\n{combined_text}\nCustomer Email: {email}{few_shot_context}"

    groq_key = os.environ.get('GROQ_API_KEY', '')
    groq_base = os.environ.get('GROQ_BASE_URL', 'https://api.groq.com/openai/v1')
    groq_model = os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile')

    xai_key = os.environ.get('XAI_API_KEY', '')
    xai_base = os.environ.get('XAI_BASE_URL', 'https://api.x.ai/v1')
    xai_model = os.environ.get('XAI_MODEL', 'grok-beta')

    openai_key = os.environ.get('OPENAI_API_KEY', '')
    openai_base = os.environ.get('AI_BASE_URL', 'https://api.openai.com/v1')
    openai_model = os.environ.get('AI_MODEL', 'gpt-4o-mini')

    gemini_key = os.environ.get('GEMINI_API_KEY', '')
    gemini_model_name = os.environ.get('GEMINI_MODEL', 'gemini-2.0-flash-exp')

    parsed = None

    # --- 1. GOOGLE GEMINI ---
    if gemini_key and gemini_key != 'your_gemini_api_key_here':
        try:
            print(f'[DEBUG] Attempting Gemini call (Model: {gemini_model_name})')
            client = genai.Client(api_key=gemini_key)
            response = client.models.generate_content(
                model=gemini_model_name,
                contents=user_content,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0
                )
            )
            if response and response.text:
                res = safe_json_parse(response.text)
                if res:
                    print('[DEBUG] Gemini Success ✅')
                    parsed = res
        except Exception as e:
            print(f'[DEBUG] Gemini API failed: {e}')

    # --- 2. CLOUD AI (GROQ / OPENAI) ---
    if groq_key and groq_key != 'your_groq_api_key_here':
        try:
            print(f'[DEBUG] Attempting Groq call (Model: {groq_model})')
            content = _llm_call(groq_base, groq_key, groq_model, SYSTEM_PROMPT, user_content)
            res = safe_json_parse(content)
            if res:
                print('[DEBUG] Groq Success ✅')
                parsed = res
        except Exception as e:
            print(f'[DEBUG] Groq API failed: {e}')

    if not parsed and openai_key and openai_key != 'your_api_key_here':
        try:
            print(f'[DEBUG] Attempting OpenAI call (Model: {openai_model})')
            content = _llm_call(openai_base, openai_key, openai_model, SYSTEM_PROMPT, user_content)
            res = safe_json_parse(content)
            if res:
                print('[DEBUG] OpenAI Success ✅')
                parsed = res
        except Exception as e:
            print(f'[DEBUG] OpenAI API failed: {e}')

    if not parsed and xai_key and xai_key != 'your_xai_api_key_here':
        try:
            print(f'[DEBUG] Attempting Grok (xAI) call (Model: {xai_model})')
            content = _llm_call(xai_base, xai_key, xai_model, SYSTEM_PROMPT, user_content)
            res = safe_json_parse(content)
            if res:
                print('[DEBUG] Grok (xAI) Success ✅')
                parsed = res
        except Exception as e:
            print(f'[DEBUG] Grok (xAI) API failed: {e}')



    # --- 3. FINAL FALLBACK: HEURISTICS ---
    if not parsed:
        parsed = local_heuristic_fallback(combined_text, cleaned_problem, cleaned_solution, email)
    
    # --- FINAL POST-PROCESSING (STRICT TAXONOMY ENFORCEMENT) ---
    final_result = parsed if isinstance(parsed, dict) else {}
    fields_to_enforce = ["issue_category", "issue_subcategory", "root_cause", "severity", "churn_risk", "resolution_type"]
    for field in fields_to_enforce:
        if field in final_result:
            final_result[field] = force_taxonomy_match(field, final_result[field])
            
    # Cache the final result before returning
    _AI_CACHE[cache_key] = final_result
    return final_result


def local_heuristic_fallback(combined_text, cleaned_problem, cleaned_solution, email):
    print('Using Intelligent Keyword Heuristics...')

    conversation = []
    if re.search(r'(Customer:|Support:|Agent:)', combined_text, re.I):
        parts = re.split(r'(Customer:|Support:|Agent:)', combined_text, flags=re.I)
        parts = [p for p in parts if p.strip()]
        current_role = 'customer'
        for part in parts:
            p = part.strip()
            if p.lower() == 'customer:':
                current_role = 'customer'
            elif p.lower() in ('support:', 'agent:'):
                current_role = 'agent'
            elif p:
                conversation.append({
                    'role': current_role,
                    'message': p,
                    'timestamp': 'Customer Message' if current_role == 'customer' else 'Support Response'
                })
    else:
        if combined_text:
            conversation.append({'role': 'customer', 'message': combined_text, 'timestamp': 'Initial Report & Resolution'})

    # Split into sentences (simple approach without compromise NLP)
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', combined_text) if s.strip()]
    nouns = re.findall(r'\b[A-Z][a-z]{2,}\b', combined_text)
    tech_models = re.findall(r'[A-Z]{1,4}-?[0-9]{1,5}', combined_text)
    tech_model_str = tech_models[0] if tech_models else ''

    category = detect_problem_category(combined_text)
    level = detect_severity_level(combined_text)
    root_cause = detect_root_cause_intent(combined_text)
    sol_sentence = extract_solution_sentence(sentences)
    sol_summary = generate_solution_summary(sol_sentence)

    # Extract the CUSTOMER's company — never Factbird (the support provider)
    SUPPORT_DOMAINS = {'factbird.com', 'factbird.io', 'factbird.dk', 'factbird.com.au'}
    GENERIC_DOMAINS = {'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'me.com', 'live.com'}
    SKIP_COMPANIES = {
        'factbird', 'support', 'customer', 'hello', 'hi', 'dear', 'regards',
        'team', 'agent', 'please', 'thanks', 'thank', 'hope', 'good', 'best',
        'kind', 'this', 'that', 'your', 'our', 'the', 'and', 'for', 'with'
    }

    company_name = 'Unknown'
    if email and '@' in email:
        domain = email.split('@')[1].lower()
        if domain not in SUPPORT_DOMAINS and domain not in GENERIC_DOMAINS:
            company_part = domain.split('.')[0]
            company_name = re.sub(r'[-_]', ' ', company_part).title()

    # If company name is still Unknown (factbird domain or generic email), extract from text
    if company_name == 'Unknown' or (email and '@' in email and email.split('@')[1].lower() in GENERIC_DOMAINS | SUPPORT_DOMAINS):
        # Ordered patterns from most specific to least specific
        text_patterns = [
            # "at <Company>" / "from <Company>" / "with <Company>"
            r'\bat\s+([A-Z][A-Za-z0-9][A-Za-z0-9 &\-]{1,28}?)(?:\s+(?:company|corp|inc|ltd|as|a\/s|gmbh|group|plc))?(?:\b|,|\.)',
            r'\b(?:from|with)\s+([A-Z][A-Za-z0-9][A-Za-z0-9 &\-]{1,28}?)(?:\s+(?:company|corp|inc|ltd|as|a\/s|gmbh|group|plc))?(?:\b|,|\.)',
            # "<Company> departments/factory/plant/site/facility/team"
            r'\b([A-Z][A-Za-z0-9][A-Za-z0-9 &\-]{1,28}?)\s+(?:department|departments|factory|plant|site|facility|facilities|division|operations|production)',
            # "I am from / I work at / I work for <Company>"
            r'\bI\s+(?:am\s+from|work\s+(?:at|for)|represent)\s+([A-Z][A-Za-z0-9][A-Za-z0-9 &\-]{1,28})',
            # "<Company> customer" or "customer of <Company>"
            r'\b([A-Z][A-Za-z0-9][A-Za-z0-9 &\-]{1,28}?)\s+customer\b',
            r'\bcustomer\s+of\s+([A-Z][A-Za-z0-9][A-Za-z0-9 &\-]{1,28})',
            # Start of line: "<Company> Team/Support/Maintenance"
            r'(?:^|\n)([A-Z][A-Za-z0-9][A-Za-z0-9 &\-]{1,28}?)\s+(?:Team|Support|Maintenance|Group)',
            # Subject line: "Re: <Company> -" or "<Company>:"
            r'Subject:\s*(?:Re:\s*)?([A-Z][A-Za-z]{2,25})\s*[-–:]',
        ]
        for pattern in text_patterns:
            m = re.search(pattern, combined_text, re.MULTILINE)
            if m:
                extracted = m.group(1).strip()
                # Remove trailing common words
                extracted = re.sub(r'\s+(?:the|a|an|and|or|of|for|in|on|at|by)$', '', extracted, flags=re.I).strip()
                if (extracted.lower() not in SKIP_COMPANIES
                        and len(extracted) >= 2
                        and not extracted.lower().startswith('factbird')):
                    company_name = extracted
                    break

        # Last resort: find the most frequent proper noun that isn't a stop word
        if company_name == 'Unknown':
            proper_nouns = re.findall(r'\b([A-Z][a-z]{2,20})\b', combined_text)
            freq: dict = {}
            for noun in proper_nouns:
                if noun.lower() not in SKIP_COMPANIES:
                    freq[noun] = freq.get(noun, 0) + 1
            if freq:
                best = max(freq, key=lambda k: freq[k])
                if freq[best] >= 2:  # must appear at least twice to be reliable
                    company_name = best

        # Step 3.5: Match against known companies from taxonomy
        if company_name == 'Unknown':
            known_companies = taxonomy.get('companies', [])
            combined_lower = combined_text.lower()
            for known_co in known_companies:
                # Try full name first (case-insensitive) — most precise
                if known_co.lower() in combined_lower:
                    company_name = known_co
                    break
                # Try each significant word (≥4 chars) from the company name
                words = [w for w in known_co.split() if len(w) >= 4]
                # type: ignore
                if words and any(str(w).lower() in combined_lower for w in words):
                    company_name = known_co
                    break
            # Final fallback: use first known company from taxonomy (never show "Customer"/"Unknown")
            if company_name == 'Unknown' and known_companies:
                company_name = known_companies[0]

    lower_text = combined_text.lower()
    res_type = 'Unknown'
    if 'fixed itself' in lower_text or 'online now' in lower_text:
        res_type = 'Self Resolved'
    elif any(kw in lower_text for kw in ('how to', 'guidance', 'instruction', 'steps', 'explanation', 'guide')):
        res_type = 'Configuration Guidance'
    elif any(kw in lower_text for kw in ('we have', 'fixed', 'updated', 'configured')):
        res_type = 'Support Fix'

    churn_risk = 'No'
    if re.search(r'cancel|stop|leaving|frustrated|poor service|not happy|leaving', combined_text, re.I):
        churn_risk = 'Yes'

    upsell_opp = 'No'
    if re.search(r'more sensors|upgrade|additional|new site|pricing|buying|purchase', combined_text, re.I):
        upsell_opp = 'Yes'

    problem_sentence = detect_problem_sentence(sentences)
    final_problem = problem_sentence or (sentences[0] if sentences else combined_text[:60])

    confidence = calculate_confidence(final_problem, sol_summary)

    def clean_result(s):
        if not s:
            return ""
        s = s.replace('\\n', ' ').replace('\r\n', ' ').replace('\n', ' ')
        s = re.sub(r'^["\'"]|["\'"]$', '', s)
        s = re.sub(r'^(Re|Fwd|FW|Subject|Pending request):\s*', '', s, flags=re.I)
        s = re.sub(r'\[.*?\]\s*', '', s)
        return re.sub(r'\s+', ' ', s).strip()

    SKIP_NOUNS = {'new year', 'hello', 'hej', 'hi', 'dear', 'greetings', 'thanks', 'regards'}
    clean_nouns = [n for n in nouns if len(n) > 2 and n.lower() not in SKIP_NOUNS and not re.search(r'[!?,.;:]', n)]

    suggested_action = 'Provide clearer instructions and ensure the resolution process is easy to follow.'
    if category == 'Account Access':
        suggested_action = 'Provide clearer password reset instructions and ensure reset emails are easy to identify.'
    elif category == 'Sensor Connectivity':
        suggested_action = 'Check device network connection, power status, and gateway connectivity.'
    elif category == 'Device Configuration':
        suggested_action = 'Ensure the installation guide is up to date and provided during onboarding.'
    elif category == 'Platform Configuration':
        suggested_action = 'Consult site configuration settings and verify ID mappings.'

    def detect_subcategory_intent(text):
        p = text.lower()
        if 'sensor' in p: return 'Offline Sensor'
        if 'gateway' in p: return 'Gateway Connectivity'
        if 'wifi' in p or 'wi-fi' in p or 'wireless' in p: return 'WiFi Configuration'
        if 'cellular' in p or '4g' in p or 'sim card' in p: return 'Cellular Connectivity'
        if 'duo' in p: return 'Duo Setup'
        if 'hardware' in p or 'replace' in p or 'swap' in p: return 'Hardware Replacement Request'
        if 'firmware' in p: return 'Firmware Update'
        if 'install' in p or 'onboard' in p: return 'Installation Help'
        if 'password' in p or 'reset' in p: return 'Password Reset'
        if 'login' in p or 'sign in' in p or 'authenticate' in p: return 'Login Failure'
        if 'permission' in p or 'access right' in p or 'user role' in p: return 'User Permissions'
        if 'activity' in p: return 'Activity Setting'
        if 'stop cause' in p: return 'Stop Cause Setup'
        if 'id mapping' in p or 'mapping' in p: return 'ID Mapping'
        if 'data export' in p or 'export' in p: return 'Data Export'
        if 'dashboard' in p or 'report' in p: return 'Dashboard / Reporting Issue'
        if 'api' in p or 'graphql' in p or 'integration' in p: return 'API Integration'
        if 'firewall' in p or 'whitelist' in p or 'network' in p: return 'Network Firewall / Whitelist'
        return 'Site Configuration'

    subcategory = detect_subcategory_intent(combined_text)

    result = {
        'problem_summary': clean_problem_summary(clean_result(final_problem)),
        'solution_summary': clean_result(sol_summary),
        'company_name': company_name,
        'issue_category': category,
        'issue_subcategory': subcategory,
        'root_cause': root_cause,
        'suggested_action': suggested_action,
        'ideal_resolution_tier': 'Tier 2 (Technical support – config, troubleshooting)' if level == 'high' else ('Tier 3 (Engineering – bugs, deep issues)' if level == 'critical' else 'Tier 1 (Basic support – FAQs, password reset, simple issues)'),
        'churn_risk': churn_risk,
        'expansion_signal': upsell_opp,
        'preventability': 'Not Preventable',
        'upsell_opportunity': upsell_opp,
        'severity': level,
        'feature_request': 'None',
        'confidence_score': confidence,
        'resolution_type': res_type,
        'conversation_thread': conversation,
        'stakeholders': [],
        'device_ids': [],
        'notes': '',
        'reasoning': 'Determined via local heuristic NLP analysis.'
    }
    
    # Post-Process: Strict Taxonomy Enforcement
    fields_to_enforce = ["issue_category", "issue_subcategory", "root_cause", "severity", "churn_risk", "resolution_type"]
    for field in fields_to_enforce:
        if field in result:
            result[field] = force_taxonomy_match(field, result[field])
            
    return result
