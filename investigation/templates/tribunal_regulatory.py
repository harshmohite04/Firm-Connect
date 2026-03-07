from typing import Dict, List

TEMPLATES: Dict[str, str] = {
    "nclt_application": """BEFORE THE NATIONAL COMPANY LAW TRIBUNAL
{bench_name} BENCH
AT {place}

COMPANY PETITION / APPLICATION No. _________ of 20____

UNDER SECTION {section} OF THE COMPANIES ACT, 2013 /
INSOLVENCY AND BANKRUPTCY CODE, 2016

{applicant_name}
{applicant_address}                              ... Applicant/Petitioner

                        VERSUS

{respondent_company}
CIN: {cin_number}
Registered Office: {registered_office}           ... Respondent

APPLICATION BEFORE THE NCLT

MOST RESPECTFULLY SHOWETH:

1. PARTIES:
   a. The Applicant is {applicant_description}.
   b. The Respondent is a company incorporated under the Companies Act,
      having CIN {cin_number}, with registered office at {registered_office}.

2. NATURE OF APPLICATION:
   This application is filed under Section {section} of the {act} for
   {purpose_of_application}.

3. BRIEF FACTS:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}
   d. {fact_4}

4. DETAILS OF DEFAULT/DISPUTE (if applicable):
   a. Nature of debt/claim: {debt_nature}
   b. Amount: Rs. {claim_amount}/-
   c. Date of default: {default_date}
   d. Evidence of default: {default_evidence}

5. GROUNDS:
   a. {ground_1}
   b. {ground_2}
   c. {ground_3}

6. That the applicant has complied with all pre-filing requirements
   including {pre_filing_requirements}.

PRAYER:
It is most respectfully prayed that this Hon'ble Tribunal may be pleased to:
(a) {prayer_1};
(b) {prayer_2};
(c) Pass any other order as this Hon'ble Tribunal may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.

LIST OF DOCUMENTS:
1. {document_1}
2. {document_2}
3. {document_3}

VERIFICATION:
I, {applicant_name}, do hereby verify that the contents are true and
correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

{applicant_name}
Applicant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "sat_appeal": """BEFORE THE SECURITIES APPELLATE TRIBUNAL
AT {place}

APPEAL No. _________ of 20____

UNDER SECTION 15T OF THE SECURITIES AND EXCHANGE BOARD OF INDIA ACT, 1992

{appellant_name}
{appellant_address}                              ... Appellant

                        VERSUS

SECURITIES AND EXCHANGE BOARD OF INDIA
{sebi_address}                                   ... Respondent

APPEAL AGAINST THE ORDER OF SEBI

MOST RESPECTFULLY SHOWETH:

1. PARTICULARS OF THE IMPUGNED ORDER:
   a. Order No.: {order_number}
   b. Date: {order_date}
   c. Passed by: {passing_authority}
   d. Nature of Order: {order_nature}

2. BRIEF FACTS:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}

3. IMPUGNED ORDER:
   {order_summary}

4. GROUNDS OF APPEAL:
   a. That the impugned order is contrary to law and facts.
   b. That the principles of natural justice were violated.
   c. That the order is disproportionate to the alleged violation.
   d. {additional_ground_1}
   e. {additional_ground_2}

5. That this appeal is being filed within the prescribed period of
   limitation of 45 days from the date of the impugned order.

PRAYER:
It is most respectfully prayed that this Hon'ble Tribunal may be pleased to:
(a) Set aside the impugned order dated {order_date};
(b) {specific_prayer};
(c) Stay the operation of the impugned order pending disposal of this appeal;
(d) Pass any other order as this Hon'ble Tribunal may deem fit and proper.

{appellant_name}
Appellant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "ngt_application": """BEFORE THE NATIONAL GREEN TRIBUNAL
{bench_name}
AT {place}

ORIGINAL APPLICATION No. _________ of 20____

UNDER SECTION {section} OF THE NATIONAL GREEN TRIBUNAL ACT, 2010

{applicant_name}
{applicant_address}                              ... Applicant

                        VERSUS

1. {respondent_1}
   {respondent_1_address}                        ... Respondent No. 1

2. {respondent_2}
   {respondent_2_address}                        ... Respondent No. 2

3. State Pollution Control Board
   {spcb_address}                                ... Respondent No. 3

APPLICATION FOR ENVIRONMENTAL RELIEF

MOST RESPECTFULLY SHOWETH:

1. That the applicant is {applicant_description} and is affected by the
   environmental violations described below.

2. ENVIRONMENTAL VIOLATION:
   a. Nature of violation: {violation_nature}
   b. Location: {violation_location}
   c. Duration: {violation_duration}
   d. Impact: {violation_impact}

3. BRIEF FACTS:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}

4. LAWS/RULES VIOLATED:
   a. {law_1}
   b. {law_2}
   c. {law_3}

5. ENVIRONMENTAL DAMAGE:
   {damage_details}

6. ATTEMPTS TO RESOLVE:
   a. Complaint to SPCB/CPCB on {complaint_date}: {complaint_status}
   b. {other_attempts}

7. That the matter involves a substantial question relating to the
   environment within the meaning of Section 14/15/16 of the NGT Act.

PRAYER:
It is most respectfully prayed that this Hon'ble Tribunal may be pleased to:
(a) Direct the respondent(s) to {primary_relief};
(b) Direct compensation of Rs. {compensation_amount}/- for environmental
    damage and restoration;
(c) Direct the SPCB to take action against the violator;
(d) Pass any other order as this Hon'ble Tribunal may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.

VERIFICATION:
Verified at {place} on this ___ day of _______, 20___.

{applicant_name}
Applicant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "drt_application": """BEFORE THE DEBTS RECOVERY TRIBUNAL
AT {place}

ORIGINAL APPLICATION No. _________ of 20____

UNDER SECTION 19 OF THE RECOVERY OF DEBTS AND BANKRUPTCY ACT, 1993

{bank_name}
{bank_address}                                   ... Applicant/Bank

                        VERSUS

1. {borrower_name}
   {borrower_address}                            ... Defendant No. 1/Borrower

2. {guarantor_name}
   {guarantor_address}                           ... Defendant No. 2/Guarantor

APPLICATION FOR RECOVERY OF DEBT

MOST RESPECTFULLY SHOWETH:

1. PARTIES:
   a. The Applicant is a banking company/financial institution.
   b. The Defendant No. 1 is the borrower.
   c. The Defendant No. 2 is the guarantor.

2. LOAN DETAILS:
   a. Loan Account No.: {loan_account}
   b. Type of Facility: {facility_type}
   c. Sanction Date: {sanction_date}
   d. Sanction Amount: Rs. {sanction_amount}/-
   e. Rate of Interest: {interest_rate}% p.a.
   f. Security: {security_details}

3. DISBURSEMENT:
   Rs. {disbursed_amount}/- was disbursed on {disbursement_date}.

4. DEFAULT:
   a. The defendant(s) committed default in repayment w.e.f. {default_date}.
   b. The account was classified as NPA on {npa_date}.
   c. Outstanding as on {statement_date}: Rs. {outstanding_amount}/-
      (Principal: Rs. {principal}/- + Interest: Rs. {interest}/-)

5. DEMAND NOTICE:
   A demand notice u/s 13(2) of the SARFAESI Act / recall notice was issued
   on {notice_date}, but the defendant(s) failed to pay.

6. That the debt exceeds Rs. 20,00,000/- and falls within the jurisdiction
   of this Hon'ble Tribunal.

PRAYER:
It is most respectfully prayed that this Hon'ble Tribunal may be pleased to:
(a) Pass a recovery certificate for Rs. {claim_amount}/- with interest;
(b) Issue certificate for recovery of the said amount;
(c) Attach the properties/assets of the defendant(s);
(d) Pass any other order as this Hon'ble Tribunal may deem fit and proper.

{bank_name}
Through Authorised Officer

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",
}

METADATA: List[dict] = [
    {"id": "nclt_application", "name": "NCLT Application", "description": "Application before National Company Law Tribunal (company/insolvency matters)", "category": "Tribunal & Regulatory"},
    {"id": "sat_appeal", "name": "SAT Appeal", "description": "Appeal before Securities Appellate Tribunal against SEBI orders", "category": "Tribunal & Regulatory"},
    {"id": "ngt_application", "name": "NGT Application", "description": "Application before National Green Tribunal for environmental relief", "category": "Tribunal & Regulatory"},
    {"id": "drt_application", "name": "DRT Application", "description": "Application before Debts Recovery Tribunal for recovery of bank debts", "category": "Tribunal & Regulatory"},
]
