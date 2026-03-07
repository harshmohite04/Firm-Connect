from typing import Dict, List

TEMPLATES: Dict[str, str] = {
    "vakalatnama": """VAKALATNAMA

IN THE COURT OF {court_name}
AT {place}

{case_type} No. _________ of 20____

{party1_name}                                    ... {party1_designation}
                        VERSUS
{party2_name}                                    ... {party2_designation}

I/We, the above named {party1_designation}, do hereby appoint and retain
{advocate_name}, Advocate, enrolled with the Bar Council of {state}
(Enrollment No. {enrollment_no}), to act, appear and plead on my/our behalf
in the above matter and in all proceedings connected therewith.

AND I/We do hereby authorise the said Advocate:
1. To sign, file and present any pleadings, applications, affidavits, or documents.
2. To appear on all dates of hearing and to make submissions.
3. To withdraw or compromise the matter.
4. To receive notices on my/our behalf.
5. To file appeals, revisions, or reviews.
6. To engage any other advocate as he/she may deem fit.
7. To do all other acts and things necessary for the conduct of the case.

IN WITNESS WHEREOF, I/We have signed this Vakalatnama on this ___ day of _______, 20___.

{client_name}
{client_designation}
Address: {client_address}

ACCEPTED:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}

IDENTIFIED BY:
{identifier_name}, Advocate
Enrollment No.: {identifier_enrollment_no}""",

    "plaint": """IN THE COURT OF {court_name}
AT {place}

CIVIL SUIT No. _________ of 20____

{plaintiff_name}
S/o / D/o / W/o {plaintiff_parent}
R/o {plaintiff_address}                          ... Plaintiff

                        VERSUS

{defendant_name}
S/o / D/o / W/o {defendant_parent}
R/o {defendant_address}                          ... Defendant

PLAINT UNDER ORDER VII RULE 1 OF THE CODE OF CIVIL PROCEDURE, 1908

MOST RESPECTFULLY SHOWETH:

1. That the plaintiff is {plaintiff_description} and is entitled to file the present suit.

2. That the defendant is {defendant_description} and is liable to be sued.

3. CAUSE OF ACTION:
   That the cause of action arose on {cause_date} when {cause_of_action}.

4. FACTS OF THE CASE:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}
   d. {fact_4}

5. JURISDICTION:
   That this Hon'ble Court has jurisdiction to try the present suit as the
   cause of action has arisen within the territorial jurisdiction of this Court
   and the subject matter of the suit is valued at Rs. {suit_value}/-.

6. VALUATION AND COURT FEE:
   That the suit is valued at Rs. {suit_value}/- for the purpose of jurisdiction
   and court fee. Court fee of Rs. {court_fee}/- has been affixed on the plaint.

7. LIMITATION:
   That the present suit is within the period of limitation as the cause of
   action arose on {cause_date}.

8. That the plaintiff has not filed any other suit or proceeding in any court
   regarding the same cause of action.

PRAYER:
In the light of the facts and circumstances stated above, it is most respectfully
prayed that this Hon'ble Court may graciously be pleased to:

(a) {prayer_1};
(b) {prayer_2};
(c) Award costs of the suit to the plaintiff;
(d) Pass any other order as this Hon'ble Court may deem fit and proper in the
    interest of justice.

AND FOR THIS ACT OF KINDNESS, THE PLAINTIFF SHALL EVER PRAY.

VERIFICATION:
I, {plaintiff_name}, the plaintiff above-named, do hereby verify that the contents
of the above plaint are true and correct to the best of my knowledge and belief,
that no material facts have been concealed and that nothing stated above is false.

Verified at {place} on this ___ day of _______, 20___.

{plaintiff_name}
Plaintiff

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "written_statement": """IN THE COURT OF {court_name}
AT {place}

{case_type} No. {case_number} of 20____

{plaintiff_name}                                 ... Plaintiff
                        VERSUS
{defendant_name}                                 ... Defendant

WRITTEN STATEMENT ON BEHALF OF THE DEFENDANT

MOST RESPECTFULLY SHOWETH:

PRELIMINARY OBJECTIONS:

1. That the present suit is not maintainable in its present form and is liable
   to be dismissed.

2. That this Hon'ble Court has no jurisdiction to try the present suit as
   {jurisdiction_objection}.

3. That the suit is barred by limitation as {limitation_objection}.

4. That the plaintiff has no locus standi to file the present suit as
   {locus_objection}.

PARAWISE REPLY:

5. That the contents of para 1 of the plaint are {response_para1}.

6. That the contents of para 2 of the plaint are {response_para2}.

7. That the contents of para 3 of the plaint are {response_para3}.

8. That the contents of para 4 of the plaint are {response_para4}.

ADDITIONAL PLEAS OF THE DEFENDANT:

9. {additional_plea_1}

10. {additional_plea_2}

PRAYER:
In light of the above submissions, it is most respectfully prayed that this
Hon'ble Court may graciously be pleased to:

(a) Dismiss the suit of the plaintiff with costs;
(b) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE DEFENDANT SHALL EVER PRAY.

VERIFICATION:
I, {defendant_name}, the defendant above-named, do hereby verify that the contents
of the above written statement are true and correct to the best of my knowledge
and belief, and nothing material has been concealed.

Verified at {place} on this ___ day of _______, 20___.

{defendant_name}
Defendant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "bail_application": """IN THE COURT OF {court_name}
AT {place}

BAIL APPLICATION u/s {section} of {act}

FIR No. {fir_number} of 20____
Police Station: {police_station}
Under Sections: {sections_charged}

State                                            ... Prosecution
                        VERSUS
{accused_name}                                   ... Accused/Applicant

APPLICATION FOR GRANT OF REGULAR BAIL

MOST RESPECTFULLY SHOWETH:

1. That the applicant is an accused in the above-mentioned FIR registered at
   Police Station {police_station} under Sections {sections_charged}.

2. That the applicant was arrested on {arrest_date} and has been in judicial
   custody since {custody_date}.

3. BRIEF FACTS OF THE CASE:
   {case_facts}

4. GROUNDS FOR BAIL:
   a. That the applicant is innocent and has been falsely implicated.
   b. That the investigation is complete and the chargesheet has been filed.
   c. That the applicant is not a flight risk and has deep roots in society.
   d. That the applicant undertakes to cooperate with the investigation.
   e. That continued detention would cause irreparable harm to the applicant.
   f. {additional_grounds}

5. That the applicant is willing to furnish bail bond/surety as directed
   by this Hon'ble Court.

6. That the applicant undertakes not to tamper with evidence or influence
   witnesses.

PRAYER:
It is, therefore, most respectfully prayed that this Hon'ble Court may
graciously be pleased to:
(a) Grant regular bail to the applicant in the above FIR; and
(b) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.

VERIFICATION:
I, {accused_name}, do hereby verify that the contents of this application
are true and correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

{accused_name}
Applicant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "anticipatory_bail": """IN THE COURT OF {court_name}
AT {place}

CRIMINAL MISCELLANEOUS APPLICATION No. _________ of 20____

APPLICATION FOR ANTICIPATORY BAIL u/s 438 of Cr.P.C.
(Now Section 482 of Bharatiya Nagarik Suraksha Sanhita, 2023)

FIR No. {fir_number} of 20____
Police Station: {police_station}
Under Sections: {sections_charged}

{applicant_name}                                 ... Applicant
                        VERSUS
State of {state}                                 ... Respondent

APPLICATION FOR GRANT OF ANTICIPATORY BAIL

MOST RESPECTFULLY SHOWETH:

1. That the applicant apprehends arrest in connection with FIR No. {fir_number}
   registered at Police Station {police_station} under Sections {sections_charged}.

2. BRIEF FACTS:
   {case_facts}

3. GROUNDS FOR ANTICIPATORY BAIL:
   a. That the applicant is innocent and has been falsely implicated due to
      {reason_for_false_implication}.
   b. That the applicant has no previous criminal antecedents.
   c. That the applicant has deep roots in society and is not a flight risk.
   d. That the applicant is willing to cooperate with the investigation.
   e. That no purpose would be served by the arrest of the applicant.
   f. That the applicant is a {profession} and the arrest would cause
      irreparable damage to his/her livelihood.
   g. {additional_grounds}

4. That the applicant undertakes to:
   a. Make himself/herself available for interrogation as and when required.
   b. Not directly or indirectly make any inducement, threat, or promise to
      any person acquainted with the facts of the case.
   c. Not leave India without the prior permission of this Hon'ble Court.

PRAYER:
It is, therefore, most respectfully prayed that this Hon'ble Court may
graciously be pleased to:
(a) Grant anticipatory bail to the applicant in the event of arrest in
    connection with the above FIR;
(b) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.

VERIFICATION:
I, {applicant_name}, do hereby verify that the contents of this application
are true and correct to the best of my knowledge and belief.

Verified at {place} on this ___ day of _______, 20___.

{applicant_name}
Applicant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "quashing_petition": """IN THE HIGH COURT OF {high_court_name}
AT {place}

CRIMINAL PETITION No. _________ of 20____

PETITION u/s 482 Cr.P.C. FOR QUASHING OF FIR/ORDER
(Now Section 528 of Bharatiya Nagarik Suraksha Sanhita, 2023)

{petitioner_name}                                ... Petitioner
                        VERSUS
State of {state} & Ors.                          ... Respondent(s)

PETITION UNDER SECTION 482 Cr.P.C. FOR QUASHING

MOST RESPECTFULLY SHOWETH:

1. That the petitioner is filing the present petition for quashing of
   FIR No. {fir_number} dated {fir_date} registered at Police Station
   {police_station} under Sections {sections_charged}.

2. BRIEF FACTS:
   {case_facts}

3. GROUNDS FOR QUASHING:
   a. That the FIR/complaint does not disclose any cognizable offence against
      the petitioner.
   b. That the allegations, even if taken at face value, do not make out any
      offence against the petitioner.
   c. That the continuation of proceedings would amount to an abuse of the
      process of law.
   d. That the FIR has been lodged with mala fide intentions to harass the
      petitioner.
   e. {additional_grounds}

4. RELEVANT CASE LAW:
   a. State of Haryana v. Bhajan Lal, 1992 Supp (1) SCC 335
   b. R.P. Kapur v. State of Punjab, AIR 1960 SC 866
   c. {additional_case_law}

5. That no other effective remedy is available to the petitioner except
   invoking the inherent jurisdiction of this Hon'ble Court.

PRAYER:
It is, therefore, most respectfully prayed that this Hon'ble Court may
graciously be pleased to:
(a) Quash the FIR No. {fir_number} registered at P.S. {police_station};
(b) Stay all further proceedings arising from the said FIR;
(c) Pass any other order as this Hon'ble Court may deem fit and proper.

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

    "writ_petition": """IN THE HIGH COURT OF {high_court_name}
AT {place}

WRIT PETITION ({writ_type}) No. _________ of 20____

UNDER ARTICLE {article} OF THE CONSTITUTION OF INDIA

{petitioner_name}
{petitioner_address}                             ... Petitioner

                        VERSUS

{respondent_1}
{respondent_1_address}                           ... Respondent No. 1

{respondent_2}
{respondent_2_address}                           ... Respondent No. 2

WRIT PETITION UNDER ARTICLE {article} OF THE CONSTITUTION OF INDIA

TO,
THE HON'BLE CHIEF JUSTICE AND HIS COMPANION JUDGES OF THE HIGH COURT
OF {high_court_name}

THE HUMBLE PETITION OF THE PETITIONER ABOVE-NAMED

MOST RESPECTFULLY SHOWETH:

1. That the petitioner is {petitioner_description} and is aggrieved by the
   action/inaction of the respondent(s).

2. FACTS OF THE CASE:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}

3. IMPUGNED ORDER/ACTION:
   That the respondent(s) have {impugned_action} vide order/notification
   dated {order_date}, which is {reason_illegal}.

4. FUNDAMENTAL RIGHTS VIOLATED:
   a. Article {article_violated_1} - {description_1}
   b. Article {article_violated_2} - {description_2}

5. GROUNDS:
   a. That the impugned action is arbitrary and violative of Article 14.
   b. That the impugned action is without jurisdiction and authority of law.
   c. That the principles of natural justice have not been followed.
   d. That the impugned action is mala fide and taken with ulterior motives.
   e. {additional_grounds}

6. That the petitioner has no other efficacious remedy except to approach
   this Hon'ble Court under Article {article} of the Constitution.

7. That the petitioner has not filed any other petition in any court on
   the same cause of action.

PRAYER:
In the light of the above facts and circumstances, it is most respectfully
prayed that this Hon'ble Court may graciously be pleased to:

(a) Issue a Writ of {writ_type} or any other appropriate writ, order, or
    direction {specific_prayer};
(b) Quash/set aside the impugned order dated {order_date};
(c) Award costs of the petition to the petitioner;
(d) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE PETITIONER SHALL EVER PRAY.

VERIFICATION:
I, {petitioner_name}, the petitioner above-named, do hereby verify that the
contents of this petition are true and correct to the best of my knowledge
and belief, and nothing material has been concealed.

Verified at {place} on this ___ day of _______, 20___.

{petitioner_name}
Petitioner

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "appeal_memo": """IN THE {appellate_court}
AT {place}

{appeal_type} APPEAL No. _________ of 20____

(Arising out of {lower_court_order} dated {order_date} passed by
{lower_court} in {lower_case_number})

{appellant_name}                                 ... Appellant
                        VERSUS
{respondent_name}                                ... Respondent

MEMORANDUM OF APPEAL

TO,
THE HON'BLE JUDGES OF THE {appellate_court}

THE HUMBLE APPEAL OF THE APPELLANT ABOVE-NAMED

MOST RESPECTFULLY SHOWETH:

1. PARTICULARS OF THE IMPUGNED ORDER:
   a. Case No.: {lower_case_number}
   b. Court: {lower_court}
   c. Date of Order: {order_date}
   d. Nature of Order: {order_nature}

2. BRIEF FACTS:
   {case_facts}

3. IMPUGNED ORDER:
   That the learned {lower_court} vide its order dated {order_date} has
   {order_summary}.

4. GROUNDS OF APPEAL:
   a. That the impugned order is against the weight of evidence on record.
   b. That the learned court below has erred in law and on facts.
   c. That the learned court below failed to appreciate the evidence properly.
   d. That the impugned order is perverse and arbitrary.
   e. {additional_ground_1}
   f. {additional_ground_2}

5. SUBSTANTIAL QUESTION OF LAW (if applicable):
   {substantial_question}

PRAYER:
It is, therefore, most respectfully prayed that this Hon'ble Court may
graciously be pleased to:
(a) Set aside/modify the impugned order dated {order_date};
(b) {specific_prayer};
(c) Award costs of the appeal;
(d) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE APPELLANT SHALL EVER PRAY.

{appellant_name}
Appellant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "revision_petition": """IN THE {revision_court}
AT {place}

CRIMINAL/CIVIL REVISION No. _________ of 20____

(Against the order dated {order_date} passed by {lower_court}
in {lower_case_number})

{petitioner_name}                                ... Petitioner/Revisionist
                        VERSUS
{respondent_name}                                ... Respondent

REVISION PETITION u/s {section} of {act}

MOST RESPECTFULLY SHOWETH:

1. That the petitioner is aggrieved by the order dated {order_date} passed
   by {lower_court} in {lower_case_number}.

2. BRIEF FACTS:
   {case_facts}

3. IMPUGNED ORDER:
   {order_summary}

4. GROUNDS FOR REVISION:
   a. That the order suffers from an error of jurisdiction.
   b. That there has been a failure of justice.
   c. That the court below has acted illegally or with material irregularity.
   d. {additional_grounds}

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Set aside the impugned order dated {order_date};
(b) {specific_prayer};
(c) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE PETITIONER SHALL EVER PRAY.

{petitioner_name}
Petitioner

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "review_petition": """IN THE {court_name}
AT {place}

REVIEW PETITION No. _________ of 20____

(In {original_case_type} No. {original_case_number} decided on {decision_date})

{petitioner_name}                                ... Petitioner/Applicant
                        VERSUS
{respondent_name}                                ... Respondent

REVIEW PETITION UNDER ORDER XLVII RULE 1 CPC / SECTION {section}

MOST RESPECTFULLY SHOWETH:

1. That the petitioner seeks review of the judgment/order dated {decision_date}
   passed by this Hon'ble Court in {original_case_type} No. {original_case_number}.

2. BRIEF FACTS:
   {case_facts}

3. GROUNDS FOR REVIEW:
   a. That there is an error apparent on the face of the record.
   b. That new and important matter/evidence has been discovered which, after
      the exercise of due diligence, was not within the knowledge of the
      petitioner at the time of the order.
   c. That there is sufficient reason analogous to those specified above.
   d. {additional_grounds}

4. That the review petition is being filed within the prescribed period
   of limitation.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Review and recall the judgment/order dated {decision_date};
(b) {specific_prayer};
(c) Pass any other order as this Hon'ble Court may deem fit and proper.

{petitioner_name}
Petitioner

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "caveat_application": """IN THE COURT OF {court_name}
AT {place}

CAVEAT PETITION No. _________ of 20____

UNDER SECTION 148A OF THE CODE OF CIVIL PROCEDURE, 1908

{caveator_name}
{caveator_address}                               ... Caveator

                        VERSUS

{caveatee_name}
{caveatee_address}                               ... Caveatee

CAVEAT APPLICATION

MOST RESPECTFULLY SHOWETH:

1. That the caveator is {caveator_description} and has reason to believe
   that the caveatee may file a suit/application/petition against the
   caveator in this Hon'ble Court.

2. BRIEF FACTS:
   {case_facts}

3. That the caveator apprehends that the caveatee may obtain an ex-parte
   order without notice to the caveator, which would cause serious
   prejudice to the rights of the caveator.

4. That the caveator is entitled to be heard before any order is passed
   against the caveator.

5. That this caveat is being filed within 90 days from the date of
   apprehension and is within the prescribed limitation.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Accept this caveat and direct that no ex-parte order be passed
    against the caveator without giving the caveator an opportunity
    of being heard;
(b) Direct that notice be issued to the caveator before any order is
    passed in any proceeding filed by the caveatee.

{caveator_name}
Caveator

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}

SERVICE ADDRESS FOR NOTICES:
{service_address}""",

    "interlocutory_application": """IN THE COURT OF {court_name}
AT {place}

{case_type} No. {case_number} of 20____

{applicant_name}                                 ... {applicant_designation}
                        VERSUS
{opposite_party_name}                            ... {opposite_designation}

INTERLOCUTORY APPLICATION u/s {section} / ORDER {order} RULE {rule} CPC

APPLICATION ON BEHALF OF THE {applicant_designation}

MOST RESPECTFULLY SHOWETH:

1. That the above case is pending before this Hon'ble Court and is fixed
   for hearing on {next_date}.

2. That the applicant is filing this application for {purpose_of_application}.

3. BRIEF FACTS:
   {application_facts}

4. GROUNDS:
   a. {ground_1}
   b. {ground_2}
   c. {ground_3}

5. That the balance of convenience lies in favour of the applicant.

6. That irreparable loss and injury will be caused to the applicant if
   this application is not allowed.

7. That this application is bona fide and in the interest of justice.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) {specific_prayer};
(b) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.

{applicant_name}
{applicant_designation}

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "execution_petition": """IN THE COURT OF {court_name}
AT {place}

EXECUTION PETITION No. _________ of 20____

(Arising out of Decree/Order dated {decree_date} in {original_case_number})

{decree_holder_name}                             ... Decree Holder/Applicant
                        VERSUS
{judgment_debtor_name}                           ... Judgment Debtor/Respondent

EXECUTION PETITION UNDER ORDER XXI RULE {rule} OF CPC

MOST RESPECTFULLY SHOWETH:

1. PARTICULARS OF THE DECREE:
   a. Case No.: {original_case_number}
   b. Date of Decree: {decree_date}
   c. Court passing the Decree: {original_court}
   d. Nature of Decree: {decree_nature}
   e. Amount decreed: Rs. {decree_amount}/-
   f. Amount due: Rs. {amount_due}/- (including interest)

2. That the decree holder obtained a decree against the judgment debtor
   on {decree_date} in {original_case_number}.

3. That despite the decree, the judgment debtor has failed to comply with
   the terms of the decree.

4. DETAILS OF JUDGMENT DEBTOR'S PROPERTY:
   {property_details}

5. MODE OF EXECUTION SOUGHT:
   {execution_mode}

6. That the limitation for filing this execution petition has not expired.

7. That no previous execution petition has been filed / previous execution
   petition no. {previous_ep} was filed and {previous_ep_status}.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Execute the decree dated {decree_date} against the judgment debtor;
(b) {specific_prayer};
(c) Pass any other order as this Hon'ble Court may deem fit and proper.

{decree_holder_name}
Decree Holder

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",
}

METADATA: List[dict] = [
    {"id": "vakalatnama", "name": "Vakalatnama", "description": "Authority letter appointing an advocate to appear in court", "category": "Court Filings"},
    {"id": "plaint", "name": "Plaint (Civil Suit)", "description": "Statement of claim filed by the plaintiff in a civil suit", "category": "Court Filings"},
    {"id": "written_statement", "name": "Written Statement", "description": "Defendant's reply to the plaint in a civil suit", "category": "Court Filings"},
    {"id": "bail_application", "name": "Bail Application", "description": "Application for grant of regular bail", "category": "Court Filings"},
    {"id": "anticipatory_bail", "name": "Anticipatory Bail Application", "description": "Pre-arrest bail application u/s 438 Cr.P.C.", "category": "Court Filings"},
    {"id": "quashing_petition", "name": "Quashing Petition (482 Cr.P.C.)", "description": "Petition to quash FIR or criminal proceedings", "category": "Court Filings"},
    {"id": "writ_petition", "name": "Writ Petition", "description": "Constitutional remedy under Articles 226/32", "category": "Court Filings"},
    {"id": "appeal_memo", "name": "Memorandum of Appeal", "description": "Appeal against a lower court order or judgment", "category": "Court Filings"},
    {"id": "revision_petition", "name": "Revision Petition", "description": "Revision against an order suffering jurisdictional error", "category": "Court Filings"},
    {"id": "review_petition", "name": "Review Petition", "description": "Petition to review a judgment for error apparent on record", "category": "Court Filings"},
    {"id": "caveat_application", "name": "Caveat Application", "description": "Application to prevent ex-parte orders u/s 148A CPC", "category": "Court Filings"},
    {"id": "interlocutory_application", "name": "Interlocutory Application", "description": "Interim application in a pending case", "category": "Court Filings"},
    {"id": "execution_petition", "name": "Execution Petition", "description": "Petition to execute a decree under Order XXI CPC", "category": "Court Filings"},
]
