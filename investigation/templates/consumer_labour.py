from typing import Dict, List

TEMPLATES: Dict[str, str] = {
    "consumer_complaint": """BEFORE THE {consumer_forum}
AT {place}

CONSUMER COMPLAINT No. _________ of 20____

UNDER SECTION {section} OF THE CONSUMER PROTECTION ACT, 2019

{complainant_name}
{complainant_address}                            ... Complainant

                        VERSUS

1. {opposite_party_1}
   {op1_address}                                 ... Opposite Party No. 1

2. {opposite_party_2}
   {op2_address}                                 ... Opposite Party No. 2

CONSUMER COMPLAINT

MOST RESPECTFULLY SHOWETH:

1. That the complainant is a "consumer" within the meaning of Section 2(7)
   of the Consumer Protection Act, 2019, having purchased/availed
   {product_service} from the opposite party(ies).

2. DETAILS OF TRANSACTION:
   a. Product/Service: {product_service_details}
   b. Date of Purchase: {purchase_date}
   c. Amount Paid: Rs. {amount_paid}/-
   d. Invoice/Receipt No.: {invoice_number}
   e. Mode of Payment: {payment_mode}

3. DEFICIENCY IN SERVICE / DEFECT IN GOODS:
   a. {deficiency_1}
   b. {deficiency_2}
   c. {deficiency_3}

4. BRIEF FACTS:
   {case_facts}

5. ATTEMPTS TO RESOLVE:
   a. Complaint to opposite party on {complaint_date}: {complaint_response}
   b. Follow-up on {followup_date}: {followup_response}
   c. {additional_attempts}

6. UNFAIR TRADE PRACTICE (if applicable):
   {unfair_trade_practice}

7. That the opposite party's acts/omissions constitute deficiency in
   service/defect in goods/unfair trade practice/restrictive trade practice.

8. VALUATION AND JURISDICTION:
   The value of goods/services and compensation claimed is Rs. {total_claim}/-
   which falls within the pecuniary jurisdiction of this Hon'ble Forum.

9. LIMITATION:
   The cause of action arose on {cause_date} and this complaint is within
   the period of limitation.

PRAYER:
It is most respectfully prayed that this Hon'ble Forum may be pleased to:
(a) Direct the opposite party to {remedy_sought};
(b) Award compensation of Rs. {compensation_amount}/- for mental agony
    and harassment;
(c) Award Rs. {litigation_cost}/- towards litigation costs;
(d) Award punitive damages of Rs. {punitive_damages}/-;
(e) Pass any other order as this Hon'ble Forum may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE COMPLAINANT SHALL EVER PRAY.

LIST OF DOCUMENTS:
1. {document_1}
2. {document_2}
3. {document_3}

VERIFICATION:
I, {complainant_name}, do hereby verify that the contents are true and
correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

{complainant_name}
Complainant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "labour_complaint": """BEFORE THE {labour_authority}
AT {place}

COMPLAINT/APPLICATION No. _________ of 20____

UNDER SECTION {section} OF THE {act}

{employee_name}
{employee_address}                               ... Complainant/Workman

                        VERSUS

{employer_name}
{employer_address}                               ... Opposite Party/Management

COMPLAINT / APPLICATION

MOST RESPECTFULLY SHOWETH:

1. That the complainant was employed as {designation} with the opposite
   party from {joining_date} to {termination_date}.

2. EMPLOYMENT DETAILS:
   a. Designation: {designation}
   b. Department: {department}
   c. Date of Joining: {joining_date}
   d. Last Working Day: {last_working_day}
   e. Monthly Salary: Rs. {monthly_salary}/-
   f. Employee ID: {employee_id}

3. NATURE OF COMPLAINT:
   {complaint_nature}

4. BRIEF FACTS:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}
   d. {fact_4}

5. VIOLATION OF LAW:
   The acts/omissions of the management violate the provisions of
   {violated_provisions}.

6. ATTEMPTS TO RESOLVE:
   a. {attempt_1}
   b. {attempt_2}

7. DUES/CLAIMS:
   a. Unpaid wages: Rs. {unpaid_wages}/-
   b. Gratuity: Rs. {gratuity_amount}/-
   c. Leave encashment: Rs. {leave_encashment}/-
   d. Provident fund: Rs. {pf_amount}/-
   e. Compensation: Rs. {compensation}/-
   f. Total claim: Rs. {total_claim}/-

PRAYER:
It is most respectfully prayed that this Hon'ble Authority may be pleased to:
(a) {prayer_1};
(b) Direct payment of Rs. {total_claim}/- with interest;
(c) Award compensation for {compensation_for};
(d) Pass any other order as deemed fit and proper.

AND FOR THIS ACT OF KINDNESS, THE COMPLAINANT SHALL EVER PRAY.

VERIFICATION:
Verified at {place} on this ___ day of _______, 20___.

{employee_name}
Complainant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "rera_complaint": """BEFORE THE REAL ESTATE REGULATORY AUTHORITY
{state} (RERA)
AT {place}

COMPLAINT No. _________ of 20____

UNDER SECTION {section} OF THE REAL ESTATE (REGULATION AND DEVELOPMENT)
ACT, 2016

{complainant_name}
{complainant_address}
(Allottee/Buyer)                                 ... Complainant

                        VERSUS

{promoter_name}
{promoter_address}
RERA Registration No.: {rera_registration}       ... Respondent/Promoter

COMPLAINT UNDER RERA

MOST RESPECTFULLY SHOWETH:

1. That the complainant is an allottee/buyer who booked a unit in the
   project "{project_name}" developed by the respondent.

2. PROJECT DETAILS:
   a. Project Name: {project_name}
   b. RERA Registration No.: {rera_registration}
   c. Location: {project_location}
   d. Unit No.: {unit_number}
   e. Type: {unit_type}
   f. Area: {unit_area} sq. ft. (carpet area)

3. AGREEMENT DETAILS:
   a. Date of Agreement: {agreement_date}
   b. Total Consideration: Rs. {total_consideration}/-
   c. Amount Paid: Rs. {amount_paid}/-
   d. Promised Possession Date: {promised_date}
   e. Actual Status: {actual_status}

4. DELAY AND VIOLATIONS:
   a. {violation_1}
   b. {violation_2}
   c. {violation_3}

5. BRIEF FACTS:
   {case_facts}

6. That the respondent has violated the provisions of Sections
   {violated_sections} of the RERA Act, 2016.

7. ATTEMPTS TO RESOLVE:
   {resolution_attempts}

PRAYER:
It is most respectfully prayed that this Hon'ble Authority may be pleased to:
(a) Direct the respondent to {primary_relief};
(b) Direct payment of interest for delay at the prescribed rate;
(c) Award compensation of Rs. {compensation_amount}/-;
(d) Impose penalty on the respondent under Section {penalty_section};
(e) Pass any other order as deemed fit and proper.

AND FOR THIS ACT OF KINDNESS, THE COMPLAINANT SHALL EVER PRAY.

LIST OF DOCUMENTS:
1. Copy of Allotment Letter
2. Copy of Agreement for Sale
3. Payment receipts
4. Correspondence with the Promoter
5. {additional_documents}

VERIFICATION:
I, {complainant_name}, do hereby verify that the contents are true and
correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

{complainant_name}
Complainant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",
}

METADATA: List[dict] = [
    {"id": "consumer_complaint", "name": "Consumer Complaint", "description": "Complaint before Consumer Forum under Consumer Protection Act, 2019", "category": "Consumer & Labour"},
    {"id": "labour_complaint", "name": "Labour Complaint", "description": "Complaint before Labour Court/Authority for employment disputes", "category": "Consumer & Labour"},
    {"id": "rera_complaint", "name": "RERA Complaint", "description": "Complaint before Real Estate Regulatory Authority", "category": "Consumer & Labour"},
]
