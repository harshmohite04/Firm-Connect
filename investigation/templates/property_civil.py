from typing import Dict, List

TEMPLATES: Dict[str, str] = {
    "rent_agreement": """RENT AGREEMENT

This Rent Agreement is executed on this {date} day of {month}, 20___

BETWEEN:

{landlord_name}
S/o / D/o / W/o {landlord_parent}
R/o {landlord_address}
(Hereinafter referred to as the "LANDLORD/LESSOR", which expression shall,
unless repugnant to the context, include his/her heirs, successors, and assigns)

AND

{tenant_name}
S/o / D/o / W/o {tenant_parent}
R/o {tenant_address}
(Hereinafter referred to as the "TENANT/LESSEE", which expression shall,
unless repugnant to the context, include his/her heirs, successors, and assigns)

WHEREAS the Landlord is the owner of the property described below and has
agreed to let out the same to the Tenant on the following terms and conditions:

PROPERTY DETAILS:
Address: {property_address}
Type: {property_type}
Area: {property_area}
Description: {property_description}

NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:

1. TERM: The tenancy shall be for a period of {tenure_months} months
   commencing from {start_date} and ending on {end_date}.

2. RENT: The monthly rent shall be Rs. {rent_amount}/- ({rent_in_words}),
   payable on or before the {rent_due_date} of every month.

3. SECURITY DEPOSIT: The Tenant has paid Rs. {security_deposit}/- as
   refundable security deposit, to be returned at the time of vacating
   the premises, after deducting any dues or damages.

4. MAINTENANCE CHARGES: {maintenance_charges}

5. PURPOSE: The premises shall be used for {purpose} only.

6. ELECTRICITY AND WATER: {utility_charges}

7. SUBLETTING: The Tenant shall not sublet, assign, or part with the
   possession of the premises or any part thereof.

8. REPAIRS: Minor repairs shall be borne by the Tenant. Major structural
   repairs shall be the responsibility of the Landlord.

9. ALTERATIONS: The Tenant shall not make any structural alterations
   without the prior written consent of the Landlord.

10. TERMINATION: Either party may terminate this agreement by giving
    {notice_period} months' written notice.

11. RENEWAL: The rent shall be increased by {increment_percentage}% upon
    renewal of this agreement.

12. GENERAL CONDITIONS:
    a. The Tenant shall maintain the premises in good condition.
    b. The Tenant shall not use the premises for any illegal activity.
    c. The Tenant shall allow the Landlord to inspect the premises with
       reasonable prior notice.
    d. {additional_conditions}

IN WITNESS WHEREOF, both parties have signed this agreement on the date
first mentioned above.

LANDLORD:                              TENANT:
{landlord_name}                        {tenant_name}
Signature: ___________                 Signature: ___________

WITNESS 1:                             WITNESS 2:
Name: {witness_1_name}                 Name: {witness_2_name}
Address: {witness_1_address}           Address: {witness_2_address}
Signature: ___________                 Signature: ___________""",

    "sale_deed": """SALE DEED

This Sale Deed is executed on this {date} day of {month}, 20___

BETWEEN:

{seller_name}
S/o / D/o / W/o {seller_parent}
R/o {seller_address}
PAN: {seller_pan}    Aadhaar: {seller_aadhaar}
(Hereinafter referred to as the "SELLER/VENDOR/TRANSFEROR")

AND

{buyer_name}
S/o / D/o / W/o {buyer_parent}
R/o {buyer_address}
PAN: {buyer_pan}    Aadhaar: {buyer_aadhaar}
(Hereinafter referred to as the "BUYER/PURCHASER/TRANSFEREE")

WHEREAS:

A. The Seller is the absolute owner and in possession of the property
   described in Schedule below, having acquired the same by virtue of
   {mode_of_acquisition} dated {acquisition_date}.

B. The Seller has agreed to sell the said property to the Buyer for a
   total consideration of Rs. {sale_consideration}/- ({amount_in_words}).

C. The property is free from all encumbrances, liens, charges, mortgages,
   litigations, and claims of any nature whatsoever.

NOW THIS DEED WITNESSETH AS FOLLOWS:

1. In consideration of Rs. {sale_consideration}/- paid as follows:
   a. Rs. {advance_amount}/- paid as advance on {advance_date}
   b. Rs. {balance_amount}/- paid at the time of registration
   c. Mode of payment: {payment_mode}

2. The Seller hereby conveys, transfers, and assigns all rights, title,
   and interest in the property described in the Schedule below to the
   Buyer absolutely and forever.

3. The Seller warrants that:
   a. He/she is the absolute owner with full right to sell.
   b. The property is free from all encumbrances.
   c. All taxes, cesses, and dues have been paid up to date.
   d. There is no pending litigation relating to the property.

4. The Buyer shall bear all expenses of registration, stamp duty, and
   transfer charges.

5. The possession of the property has been handed over to the Buyer on
   the date of execution of this deed.

SCHEDULE OF PROPERTY:
{property_description}
Bounded as:
   East: {boundary_east}
   West: {boundary_west}
   North: {boundary_north}
   South: {boundary_south}
Total Area: {property_area}
Survey/Plot No.: {survey_number}
Municipal No.: {municipal_number}

IN WITNESS WHEREOF, the parties have signed this Sale Deed on the date
first mentioned above at {place}.

SELLER:                                BUYER:
{seller_name}                          {buyer_name}
Signature: ___________                 Signature: ___________

WITNESSES:
1. Name: {witness_1_name}              2. Name: {witness_2_name}
   Address: {witness_1_address}           Address: {witness_2_address}
   Signature: ___________                 Signature: ___________""",

    "gift_deed": """GIFT DEED

This Gift Deed is executed on this {date} day of {month}, 20___

BETWEEN:

{donor_name}
S/o / D/o / W/o {donor_parent}
Aged {donor_age} years
R/o {donor_address}
(Hereinafter referred to as the "DONOR")

AND

{donee_name}
S/o / D/o / W/o {donee_parent}
Aged {donee_age} years
R/o {donee_address}
(Hereinafter referred to as the "DONEE")

WHEREAS:

A. The Donor is the absolute owner of the property described in the
   Schedule below, having acquired it by {mode_of_acquisition}.

B. Out of natural love and affection that the Donor bears towards the
   Donee, who is the {relationship} of the Donor, the Donor has decided
   to gift the said property to the Donee.

NOW THIS DEED WITNESSETH AS FOLLOWS:

1. That the Donor hereby voluntarily and without any consideration,
   out of natural love and affection, gifts, grants, conveys, and
   transfers the property described in the Schedule below to the Donee.

2. That the Donee hereby accepts the gift of the said property.

3. That the Donor declares that:
   a. He/she is the absolute owner with full right to gift the property.
   b. The property is free from all encumbrances, mortgages, and liens.
   c. All taxes and dues have been paid up to date.
   d. No part of the property is under any attachment or legal proceedings.

4. That the possession of the property is hereby delivered to the Donee.

5. That the Donee shall be entitled to all rights, title, and interest
   in the property from the date of this deed.

6. That this gift is irrevocable and shall not be revoked by the Donor
   or his/her heirs, executors, or representatives.

SCHEDULE OF PROPERTY:
{property_description}
Survey/Plot No.: {survey_number}
Total Area: {property_area}
Boundaries: {boundaries}

IN WITNESS WHEREOF, the Donor and the Donee have signed this Gift Deed
on the date first mentioned above at {place}.

DONOR:                                 DONEE:
{donor_name}                           {donee_name}
Signature: ___________                 Signature: ___________

WITNESSES:
1. Name: {witness_1_name}              2. Name: {witness_2_name}
   Signature: ___________                 Signature: ___________""",

    "power_of_attorney": """POWER OF ATTORNEY

KNOW ALL MEN BY THESE PRESENTS:

This Power of Attorney is executed on this {date} day of {month}, 20___

BY:
{principal_name}
S/o / D/o / W/o {principal_parent}
Aged {principal_age} years
R/o {principal_address}
PAN: {principal_pan}    Aadhaar: {principal_aadhaar}
(Hereinafter referred to as the "PRINCIPAL/EXECUTANT")

IN FAVOUR OF:
{agent_name}
S/o / D/o / W/o {agent_parent}
Aged {agent_age} years
R/o {agent_address}
PAN: {agent_pan}    Aadhaar: {agent_aadhaar}
(Hereinafter referred to as the "AGENT/ATTORNEY")

WHEREAS the Principal is {reason_for_poa} and is unable to personally
attend to the matters described below, the Principal hereby appoints
the Agent as his/her lawful attorney to act on his/her behalf.

NOW KNOW YE AND THESE PRESENTS WITNESS THAT:

The Principal hereby authorises the Agent to do the following acts,
deeds, and things on behalf of the Principal:

1. To manage, administer, and look after the property described in
   the Schedule below.

2. To execute, sign, and register any documents including sale deeds,
   agreements, affidavits, and declarations.

3. To receive rents, payments, and other dues.

4. To appear before any government authority, court, or tribunal.

5. To open/operate bank accounts and sign cheques and documents.

6. To file/defend suits, appeals, and proceedings in any court.

7. To compromise, settle, or arbitrate any disputes.

8. To pay taxes, fees, and other charges.

9. {additional_powers}

SCHEDULE OF PROPERTY (if applicable):
{property_details}

This Power of Attorney is {type_of_poa} (General/Special) and shall
remain in force until {validity_period} / until revoked by the Principal.

The Agent shall not delegate the powers conferred herein to any other
person without the prior written consent of the Principal.

IN WITNESS WHEREOF, the Principal has executed this Power of Attorney
on the date first mentioned above at {place}.

PRINCIPAL:
{principal_name}
Signature: ___________

ACCEPTED BY AGENT:
{agent_name}
Signature: ___________

WITNESSES:
1. Name: {witness_1_name}              2. Name: {witness_2_name}
   Signature: ___________                 Signature: ___________""",

    "partition_suit": """IN THE COURT OF {court_name}
AT {place}

CIVIL SUIT No. _________ of 20____

{plaintiff_name}
R/o {plaintiff_address}                          ... Plaintiff

                        VERSUS

1. {defendant_1_name}
   R/o {defendant_1_address}                     ... Defendant No. 1
2. {defendant_2_name}
   R/o {defendant_2_address}                     ... Defendant No. 2

SUIT FOR PARTITION AND SEPARATE POSSESSION

MOST RESPECTFULLY SHOWETH:

1. That the parties are related as follows: {relationship_details}.

2. ANCESTRAL/JOINT FAMILY PROPERTY:
   That the following properties are joint family/ancestral properties:
   {property_list}

3. SCHEDULE OF PROPERTIES:
   PROPERTY A: {property_a_details}
   PROPERTY B: {property_b_details}
   PROPERTY C: {property_c_details}

4. SHARES OF THE PARTIES:
   a. Plaintiff: {plaintiff_share}
   b. Defendant No. 1: {defendant_1_share}
   c. Defendant No. 2: {defendant_2_share}

5. BRIEF FACTS:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}

6. That the plaintiff has demanded partition but the defendants have
   refused to partition the property amicably.

7. VALUATION AND COURT FEE:
   The suit is valued at Rs. {suit_value}/-.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Decree partition of the properties in accordance with the shares;
(b) Grant separate possession of the plaintiff's share;
(c) Appoint a Commissioner for division if necessary;
(d) Award costs of the suit;
(e) Pass any other order as this Hon'ble Court may deem fit and proper.

VERIFICATION:
Verified at {place} on this ___ day of _______, 20___.

{plaintiff_name}
Plaintiff

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "injunction_application": """IN THE COURT OF {court_name}
AT {place}

{case_type} No. {case_number} of 20____

{applicant_name}                                 ... Plaintiff/Applicant
                        VERSUS
{opposite_party_name}                            ... Defendant/Respondent

APPLICATION FOR {injunction_type} INJUNCTION
UNDER ORDER XXXIX RULES 1 AND 2 OF CPC

MOST RESPECTFULLY SHOWETH:

1. That the applicant has filed the above suit for {suit_purpose}.

2. BRIEF FACTS:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}

3. NEED FOR INJUNCTION:
   That the defendant is threatening/attempting to {threatened_action}
   which, if not restrained, will cause irreparable injury to the applicant.

4. GROUNDS:
   a. PRIMA FACIE CASE: The applicant has a strong prima facie case as
      {prima_facie_grounds}.
   b. BALANCE OF CONVENIENCE: The balance of convenience lies in favour
      of the applicant because {convenience_grounds}.
   c. IRREPARABLE INJURY: The applicant will suffer irreparable loss
      and injury if the injunction is not granted because {injury_grounds}.

5. That the applicant is willing to furnish security as directed by
   this Hon'ble Court.

6. That the application is bona fide and in the interest of justice.

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Grant {injunction_type} injunction restraining the defendant from
    {specific_restraint};
(b) Pass ex-parte ad-interim injunction in view of the urgency;
(c) Pass any other order as this Hon'ble Court may deem fit and proper.

AND FOR THIS ACT OF KINDNESS, THE APPLICANT SHALL EVER PRAY.

{applicant_name}
Applicant

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",

    "specific_performance": """IN THE COURT OF {court_name}
AT {place}

CIVIL SUIT No. _________ of 20____

{plaintiff_name}
R/o {plaintiff_address}                          ... Plaintiff

                        VERSUS

{defendant_name}
R/o {defendant_address}                          ... Defendant

SUIT FOR SPECIFIC PERFORMANCE OF CONTRACT

UNDER SECTIONS 10, 14, AND 16 OF THE SPECIFIC RELIEF ACT, 1963

MOST RESPECTFULLY SHOWETH:

1. That the plaintiff and the defendant entered into an agreement dated
   {agreement_date} for {agreement_purpose}.

2. TERMS OF THE AGREEMENT:
   a. Property/Subject: {property_details}
   b. Consideration: Rs. {total_consideration}/-
   c. Advance paid: Rs. {advance_paid}/-
   d. Balance payable: Rs. {balance_amount}/-
   e. Date of completion: {completion_date}
   f. {additional_terms}

3. BRIEF FACTS:
   a. {fact_1}
   b. {fact_2}
   c. {fact_3}

4. That the plaintiff has always been ready and willing to perform
   his/her part of the contract and has offered to pay the balance
   consideration.

5. That the defendant has refused/failed to perform the contract
   despite {plaintiff_actions}.

6. That monetary compensation is not an adequate remedy as the
   property is unique/the subject matter cannot be obtained elsewhere.

7. VALUATION: Rs. {suit_value}/-

PRAYER:
It is most respectfully prayed that this Hon'ble Court may be pleased to:
(a) Decree specific performance of the agreement dated {agreement_date};
(b) Direct the defendant to execute the sale deed/complete the contract;
(c) In the alternative, award damages of Rs. {damages_amount}/-;
(d) Award costs of the suit;
(e) Pass any other order as this Hon'ble Court may deem fit and proper.

VERIFICATION:
Verified at {place} on this ___ day of _______, 20___.

{plaintiff_name}
Plaintiff

Through:
{advocate_name}, Advocate
Enrollment No.: {enrollment_no}
{advocate_address}""",
}

METADATA: List[dict] = [
    {"id": "rent_agreement", "name": "Rent Agreement", "description": "Residential/commercial rental agreement between landlord and tenant", "category": "Property & Civil"},
    {"id": "sale_deed", "name": "Sale Deed", "description": "Deed for transfer of immovable property", "category": "Property & Civil"},
    {"id": "gift_deed", "name": "Gift Deed", "description": "Deed for voluntary transfer of property without consideration", "category": "Property & Civil"},
    {"id": "power_of_attorney", "name": "Power of Attorney", "description": "Authority document appointing an agent to act on behalf of principal", "category": "Property & Civil"},
    {"id": "partition_suit", "name": "Partition Suit", "description": "Suit for partition and separate possession of joint property", "category": "Property & Civil"},
    {"id": "injunction_application", "name": "Injunction Application", "description": "Application for temporary/permanent injunction under Order XXXIX CPC", "category": "Property & Civil"},
    {"id": "specific_performance", "name": "Specific Performance Suit", "description": "Suit for specific performance of contract under Specific Relief Act", "category": "Property & Civil"},
]
