from typing import Dict, List

TEMPLATES: Dict[str, str] = {
    "noc": """NO OBJECTION CERTIFICATE

Date: {date}
Place: {place}

To Whom It May Concern,

This is to certify that I/We, {issuer_name}, {issuer_designation} of
{organization}, having address at {organization_address}, have no objection
to {subject_matter}.

The details are as follows:
Name of the Person: {party_name}
{party_details}

Purpose: {purpose}

{additional_details}

This certificate is being issued at the request of the above-named person
for the purpose of {purpose}.

This NOC is valid for a period of {validity_period} from the date of issue.

Authorized Signatory:
{issuer_name}
{issuer_designation}
{organization}
{organization_address}

Date: {date}
Place: {place}

(Seal/Stamp)""",

    "demand_letter": """LEGAL DEMAND LETTER

Date: {date}

SENT BY: REGISTERED POST A.D. / SPEED POST / COURIER

To,
{recipient_name}
{recipient_address}

Subject: Demand for {subject}

Ref: {reference}

Dear Sir/Madam,

I am writing this letter on behalf of my client, {client_name}, R/o
{client_address}, regarding the above-mentioned subject.

BACKGROUND:
{background}

FACTS OF THE CASE:
1. {fact_1}
2. {fact_2}
3. {fact_3}

LEGAL BASIS:
{legal_basis}

DEMAND:
In light of the above facts and circumstances, my client hereby demands
that you:

1. {demand_1}
2. {demand_2}
3. {demand_3}

The above demands must be complied with within {timeframe} days from
the receipt of this letter, failing which my client shall be constrained
to initiate appropriate legal proceedings against you, civil and/or
criminal, at your risk, cost, and consequences.

This letter is issued without prejudice to the rights and remedies of
my client, all of which are expressly reserved.

Yours faithfully,

{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}
Phone: {phone}
Email: {email}""",

    "legal_notice": """LEGAL NOTICE

UNDER SECTION {section} OF {act}

Date: {date}

SENT BY: REGISTERED POST A.D. / SPEED POST

To,
{recipient_name}
{recipient_address}

THROUGH: {advocate_name}, Advocate
          Enrollment No.: {enrollment_no}

Subject: Legal Notice on behalf of {client_name}

Sir/Madam,

Under instructions from and on behalf of my client, {client_name},
S/o / D/o / W/o {client_parent}, aged {client_age} years, R/o
{client_address}, I hereby serve upon you the following Legal Notice:

1. That my client states that {background}.

2. FACTS:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}
   d. {fact_4}

3. That by the aforesaid acts, you have violated the provisions of
   {violated_provisions}.

4. That my client has suffered damages to the extent of Rs. {damages}/-
   on account of your said acts/omissions.

5. DEMANDS:
   You are hereby called upon to:
   a. {demand_1}
   b. {demand_2}
   c. {demand_3}

6. You are required to comply with the above demands within {timeframe}
   days from the receipt of this notice.

7. In the event of your failure to comply, my client shall be constrained
   to initiate appropriate civil/criminal proceedings against you at your
   risk, cost, and consequences, and you shall also be liable to pay
   damages, interest, and litigation costs.

8. A copy of this notice is retained in my office for record and further
   necessary action.

{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}
Phone: {phone}""",

    "notice_section80": """NOTICE UNDER SECTION 80 OF THE CODE OF CIVIL PROCEDURE, 1908

Date: {date}

SENT BY: REGISTERED POST A.D.

To,
1. {government_authority_1}
   {authority_1_address}

2. {government_authority_2}
   {authority_2_address}

Subject: Notice under Section 80 CPC prior to filing of civil suit

Sir/Madam,

Under instructions from and on behalf of my client, {client_name},
R/o {client_address}, I hereby serve this statutory notice under
Section 80 of the Code of Civil Procedure, 1908, as a mandatory
prerequisite before filing a civil suit against you.

1. NAME AND DESCRIPTION OF PLAINTIFF:
   {client_name}, {client_description}

2. CAUSE OF ACTION:
   {cause_of_action}

3. DATE OF CAUSE OF ACTION:
   {cause_date}

4. RELIEF CLAIMED:
   a. {relief_1}
   b. {relief_2}
   c. {relief_3}

5. FACTS OF THE CASE:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}

6. NAME OF THE COURT IN WHICH THE SUIT IS PROPOSED TO BE FILED:
   {proposed_court}

7. That if the aforesaid relief is not granted within TWO MONTHS from
   the date of receipt of this notice, my client shall be compelled to
   file a civil suit against you in the aforementioned court for the
   above-mentioned reliefs.

8. This notice is being sent under Section 80 CPC as a statutory
   requirement and a copy of this notice is preserved in my office.

{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}
Phone: {phone}""",

    "eviction_notice": """EVICTION NOTICE

Date: {date}

SENT BY: REGISTERED POST A.D.

To,
{tenant_name}
{tenant_address} (Rented Premises)

Subject: Notice to Vacate the Premises

Dear Sir/Madam,

Under instructions from my client, {landlord_name}, the owner/landlord
of the premises situated at {property_address}, I hereby serve upon you
the following notice:

1. That you are occupying the above-mentioned premises as a tenant under
   a rent agreement dated {agreement_date} / month-to-month tenancy.

2. The monthly rent is Rs. {rent_amount}/-.

3. GROUNDS FOR EVICTION:
   a. {ground_1}
   b. {ground_2}
   c. {ground_3}

4. That my client requires you to vacate and hand over peaceful possession
   of the above-mentioned premises within {notice_period} days / by
   {vacate_date}.

5. That upon vacating, the security deposit of Rs. {security_deposit}/-
   shall be refunded after deduction of any dues/damages as per the
   agreement.

6. That in the event of your failure to vacate the premises within the
   stipulated period, my client shall be compelled to initiate eviction
   proceedings under the {rent_control_act} at your risk, cost, and
   consequences.

Please treat this notice as final and comply accordingly.

{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}
Phone: {phone}

On behalf of:
{landlord_name}
{landlord_address}""",

    "cheque_bounce_notice": """LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881

Date: {date}

SENT BY: REGISTERED POST A.D. / SPEED POST

To,
{drawer_name}
{drawer_address}

Subject: Legal Notice for Dishonour of Cheque No. {cheque_number}

Sir/Madam,

Under instructions from and on behalf of my client, {payee_name},
R/o {payee_address}, I hereby serve upon you the following notice:

1. That you issued Cheque No. {cheque_number} dated {cheque_date} for
   Rs. {cheque_amount}/- ({amount_in_words}) drawn on {bank_name},
   {bank_branch}, in favour of my client.

2. That the said cheque was issued towards discharge of a legally
   enforceable debt/liability, namely {debt_details}.

3. That the said cheque was presented for encashment on {presentation_date}
   but was returned dishonoured with the bank memo stating
   "{dishonour_reason}".

4. That the dishonour of the said cheque has caused great financial loss,
   mental agony, and hardship to my client.

5. You are hereby called upon to pay the said sum of Rs. {cheque_amount}/-
   within FIFTEEN (15) DAYS from the date of receipt of this notice by
   way of demand draft/cash/bank transfer.

6. In the event of your failure to make the payment within the stipulated
   period of 15 days, my client shall be compelled to file a criminal
   complaint under Section 138 of the Negotiable Instruments Act, 1881,
   before the competent court, and you shall be liable for imprisonment
   up to TWO YEARS and/or fine up to TWICE the cheque amount.

7. A copy of this notice is retained for record and reference.

{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}
Phone: {phone}""",

    "relinquishment_deed": """RELINQUISHMENT DEED / RELEASE DEED

This Deed of Relinquishment is executed on this {date} day of {month}, 20___

BY:
{releasor_name}
S/o / D/o / W/o {releasor_parent}
R/o {releasor_address}
(Hereinafter referred to as the "RELEASOR/RELINQUISHER")

IN FAVOUR OF:
{releasee_name}
S/o / D/o / W/o {releasee_parent}
R/o {releasee_address}
(Hereinafter referred to as the "RELEASEE")

WHEREAS:

A. {deceased_name} passed away on {death_date} leaving behind the
   following legal heirs: {legal_heirs_list}.

B. The deceased left behind the following properties:
   {property_details}

C. The Releasor is entitled to a {share_fraction} share in the above
   properties as a legal heir.

D. The Releasor has, for consideration of Rs. {consideration}/-
   OR out of love and affection, decided to relinquish his/her share
   in favour of the Releasee.

NOW THIS DEED WITNESSETH AS FOLLOWS:

1. That the Releasor hereby voluntarily relinquishes, releases, and
   abandons all his/her right, title, interest, claim, and demand
   in the properties described above in favour of the Releasee.

2. That the Releasor shall have no claim or right over the said
   properties from the date of this deed.

3. That the Releasee shall be entitled to deal with the said properties
   in any manner as absolute owner.

4. That the Releasor confirms that this relinquishment is voluntary,
   without any coercion, undue influence, or misrepresentation.

IN WITNESS WHEREOF, the Releasor has signed this deed at {place}
on the date first mentioned above.

RELEASOR:
{releasor_name}
Signature: ___________

RELEASEE (ACCEPTED):
{releasee_name}
Signature: ___________

WITNESSES:
1. Name: {witness_1_name}              2. Name: {witness_2_name}
   Signature: ___________                 Signature: ___________""",

    "settlement_deed": """DEED OF SETTLEMENT / COMPROMISE DEED

This Deed of Settlement is executed on this {date} day of {month}, 20___

BETWEEN:

PARTY OF THE FIRST PART:
{party1_name}
R/o {party1_address}
(Hereinafter referred to as "FIRST PARTY")

AND

PARTY OF THE SECOND PART:
{party2_name}
R/o {party2_address}
(Hereinafter referred to as "SECOND PARTY")

WHEREAS:

A. A dispute has arisen between the parties regarding {dispute_subject}.

B. {dispute_background}

C. The parties have agreed to settle the dispute amicably on the
   following terms and conditions.

NOW THIS DEED WITNESSETH AS FOLLOWS:

1. RECITALS:
   {recitals}

2. TERMS OF SETTLEMENT:
   a. {term_1}
   b. {term_2}
   c. {term_3}
   d. {term_4}

3. PAYMENT (if applicable):
   The {paying_party} shall pay Rs. {settlement_amount}/- to the
   {receiving_party} as full and final settlement, payable as follows:
   {payment_schedule}

4. WITHDRAWAL OF CASES:
   Both parties agree to withdraw all pending cases/complaints/FIRs
   relating to this dispute, specifically:
   a. {case_1}
   b. {case_2}

5. MUTUAL RELEASE:
   Both parties hereby release and discharge each other from all claims,
   demands, actions, causes of action, and liabilities arising from or
   related to the dispute.

6. CONFIDENTIALITY:
   The terms of this settlement shall be kept confidential by both
   parties unless disclosure is required by law.

7. NON-DISPARAGEMENT:
   Neither party shall make any disparaging statements about the other.

8. This settlement is final and binding on both parties, their heirs,
   successors, and assigns.

9. Any breach of this settlement shall entitle the aggrieved party to
   enforce the same through the appropriate court.

IN WITNESS WHEREOF, both parties have signed this Settlement Deed at
{place} on the date first mentioned above.

FIRST PARTY:                           SECOND PARTY:
{party1_name}                          {party2_name}
Signature: ___________                 Signature: ___________

WITNESSES:
1. Name: {witness_1_name}              2. Name: {witness_2_name}
   Signature: ___________                 Signature: ___________

ADVOCATES:
{advocate_1_name}, Advocate            {advocate_2_name}, Advocate
Enrollment No.: {enrollment_1}         Enrollment No.: {enrollment_2}""",
}

METADATA: List[dict] = [
    {"id": "noc", "name": "No Objection Certificate (NOC)", "description": "Certificate of no objection for property, employment, or other purposes", "category": "Notices & Letters"},
    {"id": "demand_letter", "name": "Demand Letter", "description": "Formal legal demand letter for payment or action", "category": "Notices & Letters"},
    {"id": "legal_notice", "name": "Legal Notice", "description": "Formal legal notice under applicable law", "category": "Notices & Letters"},
    {"id": "notice_section80", "name": "Notice u/s 80 CPC", "description": "Mandatory statutory notice before suing government/public authority", "category": "Notices & Letters"},
    {"id": "eviction_notice", "name": "Eviction Notice", "description": "Notice to tenant to vacate rented premises", "category": "Notices & Letters"},
    {"id": "cheque_bounce_notice", "name": "Cheque Bounce Notice (Sec 138)", "description": "Legal notice for dishonoured cheque under NI Act", "category": "Notices & Letters"},
    {"id": "relinquishment_deed", "name": "Relinquishment Deed", "description": "Deed to release/relinquish share in inherited property", "category": "Notices & Letters"},
    {"id": "settlement_deed", "name": "Settlement / Compromise Deed", "description": "Deed recording terms of settlement between disputing parties", "category": "Notices & Letters"},
]
