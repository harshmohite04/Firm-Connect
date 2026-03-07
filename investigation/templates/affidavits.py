from typing import Dict, List

TEMPLATES: Dict[str, str] = {
    "affidavit": """AFFIDAVIT

I, {deponent_name}, S/o / D/o / W/o {deponent_parent}, aged {deponent_age}
years, R/o {deponent_address}, do hereby solemnly affirm and state on oath
as follows:

1. That I am the deponent herein and am competent to swear this affidavit.

2. That {statement_1}.

3. That {statement_2}.

4. That {statement_3}.

5. That {statement_4}.

6. That the contents of this affidavit are true and correct to the best
   of my knowledge and belief, and nothing material has been concealed.

VERIFICATION:
I, {deponent_name}, the deponent above-named, do hereby verify that the
contents of the above affidavit are true and correct to the best of my
knowledge and belief. No part of it is false and nothing material has
been concealed.

Verified at {place} on this ___ day of _______, 20___.

DEPONENT
{deponent_name}

BEFORE ME:

Notary Public / Oath Commissioner
{notary_name}
Seal & Signature""",

    "affidavit_evidence": """IN THE COURT OF {court_name}
AT {place}

{case_type} No. {case_number} of 20____

{party1_name}                                    ... {party1_designation}
                        VERSUS
{party2_name}                                    ... {party2_designation}

AFFIDAVIT OF EVIDENCE ON BEHALF OF {party_designation}

I, {witness_name}, S/o / D/o / W/o {witness_parent}, aged {witness_age}
years, {witness_occupation}, R/o {witness_address}, do hereby solemnly
affirm and state on oath as follows:

1. That I am the {relationship_to_party} in the above case and am fully
   conversant with the facts and circumstances of the case.

2. That I state that {background_statement}.

3. FACTS IN CHIEF:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}
   d. {fact_4}
   e. {fact_5}

4. DOCUMENTS:
   I crave leave to rely upon the following documents:
   a. Exhibit {exhibit_1}: {exhibit_1_description}
   b. Exhibit {exhibit_2}: {exhibit_2_description}
   c. Exhibit {exhibit_3}: {exhibit_3_description}

5. That I have no personal interest in this matter except {interest_statement}.

6. That whatever is stated above is true and correct to the best of my
   knowledge and belief.

VERIFICATION:
I, {witness_name}, do hereby verify that the contents of the above
affidavit are true and correct to the best of my knowledge and belief.
No part of it is false and nothing material has been concealed.

Verified at {place} on this ___ day of _______, 20___.

DEPONENT
{witness_name}

BEFORE ME:

Notary Public / Oath Commissioner

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}""",

    "undertaking_affidavit": """AFFIDAVIT-CUM-UNDERTAKING

I, {deponent_name}, S/o / D/o / W/o {deponent_parent}, aged {deponent_age}
years, R/o {deponent_address}, do hereby solemnly affirm and state on oath
as follows:

1. That I am the deponent herein.

2. That {background_statement}.

3. UNDERTAKING:
   I hereby solemnly undertake and affirm that:

   a. {undertaking_1}
   b. {undertaking_2}
   c. {undertaking_3}
   d. {undertaking_4}

4. That I understand that any breach of this undertaking may result in
   {consequences}.

5. That I am making this undertaking voluntarily and without any coercion,
   undue influence, or misrepresentation.

6. That I understand the legal implications of this undertaking and am
   bound by the same.

VERIFICATION:
I, {deponent_name}, do hereby verify that the contents of this affidavit
are true and correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

DEPONENT
{deponent_name}

BEFORE ME:

Notary Public / Oath Commissioner
{notary_name}
Seal & Signature""",

    "income_affidavit": """AFFIDAVIT OF INCOME

I, {deponent_name}, S/o / D/o / W/o {deponent_parent}, aged {deponent_age}
years, {occupation}, R/o {deponent_address}, do hereby solemnly affirm
and state on oath as follows:

1. That I am the deponent herein and am a permanent resident of
   {deponent_address}.

2. That my occupation is {occupation} and I am employed at / running
   business of {employer_business}.

3. INCOME DETAILS:
   a. Monthly Salary/Income: Rs. {monthly_income}/-
   b. Annual Income: Rs. {annual_income}/-
   c. Other sources of income: {other_income}
   d. Total Annual Income: Rs. {total_annual_income}/-

4. INCOME TAX DETAILS:
   a. PAN No.: {pan_number}
   b. Last ITR filed for AY: {assessment_year}
   c. Income as per last ITR: Rs. {itr_income}/-

5. That my family consists of the following members:
   a. {family_member_1}
   b. {family_member_2}
   c. {family_member_3}

6. MONTHLY EXPENDITURE:
   a. Rent: Rs. {rent}/-
   b. Food and household: Rs. {food}/-
   c. Education: Rs. {education}/-
   d. Medical: Rs. {medical}/-
   e. EMI/Loans: Rs. {emi}/-
   f. Other: Rs. {other_expenses}/-
   g. Total: Rs. {total_expenses}/-

7. That I am filing this affidavit for the purpose of {purpose}.

8. That the contents of this affidavit are true and correct.

VERIFICATION:
I, {deponent_name}, do hereby verify that the contents are true and
correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

DEPONENT
{deponent_name}

BEFORE ME:

Notary Public / Oath Commissioner
{notary_name}
Seal & Signature""",

    "name_change_affidavit": """AFFIDAVIT FOR CHANGE OF NAME

I, {old_name} (hereinafter to be known as {new_name}),
S/o / D/o / W/o {parent_name}, aged {age} years,
R/o {address}, do hereby solemnly affirm and state on oath as follows:

1. That I am a citizen of India and a permanent resident of {address}.

2. That I was previously known by the name "{old_name}" as per my
   {old_name_documents} (Aadhaar Card / PAN Card / Passport / Birth
   Certificate / School Records).

3. That I have changed my name from "{old_name}" to "{new_name}"
   with effect from {effective_date}.

4. REASON FOR NAME CHANGE:
   {reason}

5. That I have published the name change in the following:
   a. Newspaper: {newspaper_name}, dated {publication_date}
   b. Gazette Notification: {gazette_details}

6. That henceforth I shall be known as "{new_name}" for all purposes
   including but not limited to:
   a. All government records and documents
   b. Educational certificates
   c. Bank accounts and financial records
   d. Passport and identity documents
   e. Property records
   f. All other legal purposes

7. IDENTIFICATION DETAILS:
   a. Aadhaar No.: {aadhaar_number}
   b. PAN No.: {pan_number}
   c. Date of Birth: {date_of_birth}
   d. Father's/Husband's Name: {parent_name}

8. That the contents of this affidavit are true and correct to the best
   of my knowledge and belief.

VERIFICATION:
I, {new_name} (formerly known as {old_name}), do hereby verify that the
contents are true and correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

DEPONENT
{new_name}
(Formerly known as {old_name})

BEFORE ME:

Notary Public / Oath Commissioner
{notary_name}
Seal & Signature""",
}

METADATA: List[dict] = [
    {"id": "affidavit", "name": "General Affidavit", "description": "Sworn statement of facts for general purposes", "category": "Affidavits & Declarations"},
    {"id": "affidavit_evidence", "name": "Affidavit of Evidence", "description": "Examination-in-chief affidavit for court proceedings", "category": "Affidavits & Declarations"},
    {"id": "undertaking_affidavit", "name": "Undertaking Affidavit", "description": "Sworn undertaking/commitment before court or authority", "category": "Affidavits & Declarations"},
    {"id": "income_affidavit", "name": "Income Affidavit", "description": "Affidavit declaring income for court or legal proceedings", "category": "Affidavits & Declarations"},
    {"id": "name_change_affidavit", "name": "Name Change Affidavit", "description": "Affidavit for change of name in official records", "category": "Affidavits & Declarations"},
]
