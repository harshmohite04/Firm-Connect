from typing import Dict, List

TEMPLATES: Dict[str, str] = {
    "fir_draft": """TO,
THE STATION HOUSE OFFICER
{police_station}
{district}, {state}

Subject: Complaint for registration of FIR

Respected Sir/Madam,

I, {complainant_name}, S/o / D/o / W/o {complainant_parent},
aged {complainant_age} years, R/o {complainant_address},
do hereby lodge the following complaint:

DATE AND TIME OF INCIDENT: {incident_date} at approximately {incident_time}

PLACE OF OCCURRENCE: {incident_place}

ACCUSED PERSON(S):
1. {accused_1_name}, {accused_1_description}
2. {accused_2_name}, {accused_2_description}

BRIEF FACTS OF THE INCIDENT:
{incident_facts}

DETAILS OF INJURIES/LOSS:
{injury_loss_details}

WITNESSES:
1. {witness_1_name}, {witness_1_address}
2. {witness_2_name}, {witness_2_address}

SECTIONS OF LAW APPLICABLE:
{sections_applicable}

EVIDENCE AVAILABLE:
{evidence_details}

I, therefore, request you to kindly register an FIR against the above-named
accused person(s) and investigate the matter. I am ready to cooperate with
the investigation.

Date: {date}
Place: {place}

{complainant_name}
Complainant

Contact: {complainant_phone}""",

    "private_complaint": """IN THE COURT OF {court_name}
AT {place}

COMPLAINT CASE No. _________ of 20____

UNDER SECTION {section} OF {act}

{complainant_name}
S/o / D/o / W/o {complainant_parent}
R/o {complainant_address}                        ... Complainant

                        VERSUS

{accused_name}
S/o / D/o / W/o {accused_parent}
R/o {accused_address}                            ... Accused

PRIVATE COMPLAINT u/s 200 Cr.P.C.
(Now Section 223 of Bharatiya Nagarik Suraksha Sanhita, 2023)

MOST RESPECTFULLY SHOWETH:

1. That the complainant is a law-abiding citizen residing at {complainant_address}.

2. That the accused is known to the complainant and resides at {accused_address}.

3. DATE AND PLACE OF OFFENCE:
   The offence was committed on {offence_date} at {offence_place}.

4. BRIEF FACTS:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}
   d. {fact_4}

5. SECTIONS OF LAW ATTRACTED:
   The acts of the accused constitute offences punishable under
   Sections {sections_charged} of {act}.

6. WITNESSES:
   a. {witness_1_name}, {witness_1_address}
   b. {witness_2_name}, {witness_2_address}

7. DOCUMENTARY EVIDENCE:
   {documentary_evidence}

8. That the complainant approached the police at {police_station} but
   {police_response}.

9. That this complaint is being filed within the period of limitation.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Take cognizance of the offences under Sections {sections_charged};
(b) Summon the accused to face trial;
(c) Punish the accused in accordance with law;
(d) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE COMPLAINANT SHALL EVER PRAY.

VERIFICATION:
I, {complainant_name}, do hereby verify that the contents of this complaint
are true and correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

{complainant_name}
Complainant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "cheque_bounce_complaint": """IN THE COURT OF {court_name}
AT {place}

COMPLAINT CASE No. _________ of 20____

UNDER SECTION 138 READ WITH SECTION 142 OF THE
NEGOTIABLE INSTRUMENTS ACT, 1881

{complainant_name}
{complainant_address}                            ... Complainant

                        VERSUS

{accused_name}
{accused_address}                                ... Accused

COMPLAINT UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881

MOST RESPECTFULLY SHOWETH:

1. That the complainant is {complainant_description}.

2. That the accused is {accused_description} and is liable to be prosecuted.

3. DETAILS OF THE CHEQUE:
   a. Cheque No.: {cheque_number}
   b. Date of Cheque: {cheque_date}
   c. Amount: Rs. {cheque_amount}/- ({amount_in_words})
   d. Drawn on: {bank_name}, {bank_branch}
   e. Account No.: {account_number}

4. PURPOSE OF THE CHEQUE:
   That the accused issued the said cheque towards discharge of a legally
   enforceable debt/liability arising out of {debt_details}.

5. PRESENTATION AND DISHONOUR:
   a. The cheque was presented for encashment on {presentation_date}
      through {complainant_bank}.
   b. The cheque was returned unpaid/dishonoured on {dishonour_date}
      with the memo "{dishonour_reason}".

6. LEGAL NOTICE:
   a. A legal notice u/s 138 was sent to the accused on {notice_date}
      by Registered Post A.D. / Speed Post.
   b. The notice was received by the accused on {notice_receipt_date}.
   c. The accused has failed to make the payment within 15 days of
      receipt of the notice.

7. That this complaint is being filed within 30 days of the expiry of
   the 15-day notice period, i.e., within the prescribed limitation.

8. TERRITORIAL JURISDICTION:
   That this Hon'ble Court has jurisdiction as the cheque was presented
   at {presentation_place} / the complainant's bank is situated within
   the jurisdiction of this Court.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Take cognizance of the offence u/s 138 of the NI Act;
(b) Summon the accused to face trial;
(c) Punish the accused with imprisonment up to 2 years and/or fine up to
    twice the cheque amount;
(d) Direct the accused to pay compensation u/s 357 Cr.P.C.;
(e) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE COMPLAINANT SHALL EVER PRAY.

LIST OF DOCUMENTS:
1. Original dishonoured cheque
2. Bank return memo
3. Copy of legal notice
4. Postal receipt and A.D. card
5. {additional_documents}

VERIFICATION:
I, {complainant_name}, do hereby verify that the contents of this complaint
are true and correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

{complainant_name}
Complainant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",
}

METADATA: List[dict] = [
    {"id": "fir_draft", "name": "FIR Draft / Police Complaint", "description": "Draft complaint for registration of First Information Report", "category": "Criminal"},
    {"id": "private_complaint", "name": "Private Complaint (200 Cr.P.C.)", "description": "Private criminal complaint before Magistrate", "category": "Criminal"},
    {"id": "cheque_bounce_complaint", "name": "Cheque Bounce Complaint (Sec 138 NI Act)", "description": "Complaint under Section 138 of Negotiable Instruments Act", "category": "Criminal"},
]
