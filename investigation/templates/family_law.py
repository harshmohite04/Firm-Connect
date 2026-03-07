from typing import Dict, List

TEMPLATES: Dict[str, str] = {
    "divorce_petition": """IN THE COURT OF {court_name}
AT {place}

{petition_type} PETITION No. _________ of 20____

UNDER SECTION {section} OF THE {act}

{petitioner_name}
{petitioner_age}, {petitioner_occupation}
R/o {petitioner_address}                         ... Petitioner

                        VERSUS

{respondent_name}
{respondent_age}, {respondent_occupation}
R/o {respondent_address}                         ... Respondent

PETITION FOR DISSOLUTION OF MARRIAGE / DIVORCE

MOST RESPECTFULLY SHOWETH:

1. That the petitioner and the respondent were married on {marriage_date}
   at {marriage_place} according to {marriage_rites} rites and ceremonies.

2. That the marriage was solemnized in the presence of relatives and friends
   of both parties and was duly registered at {registration_details}.

3. That out of the wedlock, {children_details}.

4. GROUNDS FOR DIVORCE:
   a. {ground_1}
   b. {ground_2}
   c. {ground_3}

5. BRIEF FACTS:
   {case_facts}

6. That the petitioner has tried to reconcile the differences but has been
   unsuccessful. The marriage has irretrievably broken down.

7. That the petitioner is entitled to seek divorce under Section {section}
   of the {act} on the grounds of {specific_grounds}.

8. DETAILS OF PROPERTIES AND ASSETS:
   {property_details}

9. That {maintenance_details}.

10. That the petitioner has not filed any other proceeding for divorce in
    any other court.

11. JURISDICTION:
    That this Hon'ble Court has jurisdiction as the parties last resided
    together at {last_residence}.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Dissolve the marriage between the petitioner and the respondent by
    a decree of divorce;
(b) Grant permanent alimony/maintenance of Rs. {maintenance_amount}/- per
    month to the petitioner;
(c) Grant custody of the child(ren) to the petitioner;
(d) Award costs of the petition;
(e) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE PETITIONER SHALL EVER PRAY.

VERIFICATION:
I, {petitioner_name}, do hereby verify that the contents of this petition
are true and correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

{petitioner_name}
Petitioner

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "maintenance_application": """IN THE COURT OF {court_name}
AT {place}

CRIMINAL MISCELLANEOUS APPLICATION No. _________ of 20____

APPLICATION u/s 125 Cr.P.C.
(Now Section 144 of Bharatiya Nagarik Suraksha Sanhita, 2023)

{applicant_name}
{applicant_age}, {applicant_occupation}
R/o {applicant_address}                          ... Applicant

                        VERSUS

{respondent_name}
{respondent_age}, {respondent_occupation}
R/o {respondent_address}                         ... Respondent

APPLICATION FOR MAINTENANCE

MOST RESPECTFULLY SHOWETH:

1. That the applicant is the legally wedded {relationship} of the respondent.
   The marriage was solemnized on {marriage_date} at {marriage_place}.

2. That {children_details}.

3. FACTS AND CIRCUMSTANCES:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}

4. That the respondent has {neglect_details}, despite having sufficient
   means to maintain the applicant.

5. INCOME AND MEANS OF THE RESPONDENT:
   a. Occupation: {respondent_occupation}
   b. Monthly Income (approx.): Rs. {respondent_income}/-
   c. Properties: {respondent_properties}
   d. Other sources of income: {other_income}

6. EXPENSES AND NEEDS OF THE APPLICANT:
   a. Rent: Rs. {rent_amount}/-
   b. Food and groceries: Rs. {food_amount}/-
   c. Medical expenses: Rs. {medical_amount}/-
   d. Children's education: Rs. {education_amount}/-
   e. Other essential expenses: Rs. {other_expenses}/-
   f. Total monthly requirement: Rs. {total_requirement}/-

7. That the applicant has no independent source of income and is unable
   to maintain herself/himself and the children.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Direct the respondent to pay maintenance of Rs. {maintenance_amount}/-
    per month to the applicant and Rs. {child_maintenance}/- per month
    for each child;
(b) Direct the respondent to pay interim maintenance pending disposal;
(c) Direct the respondent to bear litigation expenses;
(d) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.

VERIFICATION:
I, {applicant_name}, do hereby verify that the contents are true and correct
to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

{applicant_name}
Applicant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "child_custody": """IN THE COURT OF {court_name}
AT {place}

GUARDIAN AND WARDS APPLICATION No. _________ of 20____

UNDER SECTION {section} OF THE GUARDIANS AND WARDS ACT, 1890
READ WITH SECTION {hma_section} OF THE {family_act}

{applicant_name}
{applicant_address}                              ... Applicant/Petitioner

                        VERSUS

{respondent_name}
{respondent_address}                             ... Respondent

APPLICATION FOR CUSTODY OF MINOR CHILD(REN)

MOST RESPECTFULLY SHOWETH:

1. That the applicant is the {relationship} of the minor child(ren):
   a. Name: {child_1_name}, Age: {child_1_age}, Date of Birth: {child_1_dob}
   b. Name: {child_2_name}, Age: {child_2_age}, Date of Birth: {child_2_dob}

2. That the applicant and the respondent were married on {marriage_date}
   at {marriage_place}.

3. PRESENT CUSTODY STATUS:
   {custody_status}

4. FACTS AND CIRCUMSTANCES:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}

5. GROUNDS FOR SEEKING CUSTODY:
   a. That the welfare of the child(ren) would be best served in the custody
      of the applicant.
   b. That the applicant can provide a stable and nurturing environment.
   c. That the applicant has the financial means to support the child(ren).
   d. That the child(ren) have expressed their wish to live with the applicant.
   e. {additional_grounds}

6. That the respondent is not a fit guardian because {unfitness_reasons}.

7. That the applicant is willing to allow reasonable visitation rights to
   the respondent.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Grant permanent custody of the minor child(ren) to the applicant;
(b) Grant reasonable visitation rights to the respondent;
(c) Direct the respondent to pay Rs. {child_maintenance}/- per month for
    the maintenance and education of the child(ren);
(d) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.

VERIFICATION:
I, {applicant_name}, do hereby verify that the contents are true and correct.

Verified at {place} on this ___ day of _______, 20___.

{applicant_name}
Applicant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "domestic_violence": """IN THE COURT OF {court_name}
AT {place}

MISCELLANEOUS APPLICATION No. _________ of 20____

APPLICATION UNDER SECTIONS 12, 18, 19, 20, 21 AND 22 OF THE
PROTECTION OF WOMEN FROM DOMESTIC VIOLENCE ACT, 2005

{applicant_name}
{applicant_age}, {applicant_occupation}
R/o {applicant_address}                          ... Aggrieved Person/Applicant

                        VERSUS

1. {respondent_1_name}
   ({relationship_1})
   R/o {respondent_address}                      ... Respondent No. 1

2. {respondent_2_name}
   ({relationship_2})
   R/o {respondent_address}                      ... Respondent No. 2

APPLICATION FOR PROTECTION ORDER AND OTHER RELIEFS

MOST RESPECTFULLY SHOWETH:

1. That the applicant is the {relationship} of the respondent No. 1 and
   is an aggrieved person within the meaning of Section 2(a) of the
   Protection of Women from Domestic Violence Act, 2005.

2. That the applicant was married to the respondent No. 1 on {marriage_date}.

3. DOMESTIC VIOLENCE SUFFERED:
   a. Physical abuse: {physical_abuse_details}
   b. Emotional/verbal abuse: {emotional_abuse_details}
   c. Economic abuse: {economic_abuse_details}
   d. Sexual abuse: {sexual_abuse_details}

4. INCIDENTS OF VIOLENCE:
   a. On {incident_date_1}: {incident_1}
   b. On {incident_date_2}: {incident_2}
   c. On {incident_date_3}: {incident_3}

5. DOMESTIC INCIDENT REPORT:
   That a Domestic Incident Report has been {dir_status} with the
   Protection Officer / Service Provider.

6. That the applicant is in need of immediate protection from the
   respondent(s).

7. DETAILS OF SHARED HOUSEHOLD:
   {shared_household_details}

8. DETAILS OF STRIDHAN AND PROPERTIES:
   {stridhan_details}

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Pass a protection order u/s 18 restraining the respondent(s) from
    committing any act of domestic violence;
(b) Grant residence order u/s 19 directing the respondent(s) not to
    dispossess the applicant from the shared household;
(c) Grant monetary relief u/s 20 of Rs. {monetary_amount}/- per month;
(d) Grant custody of child(ren) u/s 21;
(e) Grant compensation u/s 22 for injuries and emotional distress;
(f) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.

VERIFICATION:
I, {applicant_name}, do hereby verify that the contents are true and correct.

Verified at {place} on this ___ day of _______, 20___.

{applicant_name}
Aggrieved Person/Applicant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",
}

METADATA: List[dict] = [
    {"id": "divorce_petition", "name": "Divorce Petition", "description": "Petition for dissolution of marriage under Hindu/Muslim/Special Marriage Act", "category": "Family Law"},
    {"id": "maintenance_application", "name": "Maintenance Application (Sec 125)", "description": "Application for maintenance of wife and children u/s 125 Cr.P.C.", "category": "Family Law"},
    {"id": "child_custody", "name": "Child Custody Application", "description": "Application for custody of minor children under Guardians and Wards Act", "category": "Family Law"},
    {"id": "domestic_violence", "name": "Domestic Violence Application", "description": "Application under Protection of Women from Domestic Violence Act, 2005", "category": "Family Law"},
]
