from typing import Dict, List

from investigation.templates.court_filings import TEMPLATES as COURT_FILINGS_TEMPLATES, METADATA as COURT_FILINGS_METADATA
from investigation.templates.family_law import TEMPLATES as FAMILY_LAW_TEMPLATES, METADATA as FAMILY_LAW_METADATA
from investigation.templates.criminal import TEMPLATES as CRIMINAL_TEMPLATES, METADATA as CRIMINAL_METADATA
from investigation.templates.property_civil import TEMPLATES as PROPERTY_CIVIL_TEMPLATES, METADATA as PROPERTY_CIVIL_METADATA
from investigation.templates.consumer_labour import TEMPLATES as CONSUMER_LABOUR_TEMPLATES, METADATA as CONSUMER_LABOUR_METADATA
from investigation.templates.notices_letters import TEMPLATES as NOTICES_LETTERS_TEMPLATES, METADATA as NOTICES_LETTERS_METADATA
from investigation.templates.affidavits import TEMPLATES as AFFIDAVITS_TEMPLATES, METADATA as AFFIDAVITS_METADATA
from investigation.templates.tribunal_regulatory import TEMPLATES as TRIBUNAL_REGULATORY_TEMPLATES, METADATA as TRIBUNAL_REGULATORY_METADATA

# Unified template dict: template_id -> template string
TEMPLATES: Dict[str, str] = {
    **COURT_FILINGS_TEMPLATES,
    **FAMILY_LAW_TEMPLATES,
    **CRIMINAL_TEMPLATES,
    **PROPERTY_CIVIL_TEMPLATES,
    **CONSUMER_LABOUR_TEMPLATES,
    **NOTICES_LETTERS_TEMPLATES,
    **AFFIDAVITS_TEMPLATES,
    **TRIBUNAL_REGULATORY_TEMPLATES,
    # Other
    "contract": """CONTRACT AGREEMENT

This Agreement is made and executed on this {date} day of {month}, 20___

BETWEEN:

{party1_name}
{party1_address}
(Hereinafter referred to as the "FIRST PARTY")

AND

{party2_name}
{party2_address}
(Hereinafter referred to as the "SECOND PARTY")

WHEREAS the First Party and the Second Party have agreed to enter into
this agreement on the following terms and conditions:

1. SCOPE OF AGREEMENT:
   {scope}

2. TERM:
   This agreement shall be effective from {start_date} to {end_date}.

3. CONSIDERATION:
   {consideration_details}

4. OBLIGATIONS OF FIRST PARTY:
   a. {obligation_1a}
   b. {obligation_1b}

5. OBLIGATIONS OF SECOND PARTY:
   a. {obligation_2a}
   b. {obligation_2b}

6. CONFIDENTIALITY:
   {confidentiality_clause}

7. TERMINATION:
   {termination_clause}

8. DISPUTE RESOLUTION:
   Any dispute arising out of this agreement shall be resolved through
   {dispute_resolution} and subject to the jurisdiction of courts at {jurisdiction}.

9. GOVERNING LAW:
   This agreement shall be governed by the laws of India.

10. GENERAL:
    a. This agreement constitutes the entire agreement between the parties.
    b. No amendment shall be valid unless in writing signed by both parties.
    c. {additional_clauses}

IN WITNESS WHEREOF, the parties have signed this agreement on the date
first mentioned above at {place}.

FIRST PARTY:                           SECOND PARTY:
{party1_name}                          {party2_name}
Signature: ___________                 Signature: ___________

WITNESSES:
1. Name: {witness_1_name}              2. Name: {witness_2_name}
   Signature: ___________                 Signature: ___________""",
    "blank": "",
}

# Unified metadata list
TEMPLATE_METADATA: List[dict] = [
    *COURT_FILINGS_METADATA,
    *FAMILY_LAW_METADATA,
    *CRIMINAL_METADATA,
    *PROPERTY_CIVIL_METADATA,
    *CONSUMER_LABOUR_METADATA,
    *NOTICES_LETTERS_METADATA,
    *AFFIDAVITS_METADATA,
    *TRIBUNAL_REGULATORY_METADATA,
    {"id": "contract", "name": "Contract Agreement", "description": "Standard contract or agreement between parties", "category": "General"},
    {"id": "blank", "name": "Blank Document", "description": "Start from scratch with AI assistance", "category": "General"},
]


def get_template(template_id: str) -> str:
    return TEMPLATES.get(template_id, "")


def get_all_metadata() -> List[dict]:
    return TEMPLATE_METADATA
