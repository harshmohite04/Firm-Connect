from rag.rag import ask
from pydantic import BaseModel
from typing import List, Dict, Optional

class DocumentGenerator:
    def __init__(self):
        self.templates = {
            "noc": """NO OBJECTION CERTIFICATE

To Whom It May Concern,

This is to certify that {party_name} has no objection to {subject_matter}.

{additional_details}

Issued on: {date}

Authorized Signatory
{organization}""",
            
            "demand_letter": """LEGAL DEMAND LETTER

Date: {date}

To,
{recipient_name}
{recipient_address}

Subject: Demand for {subject}

Dear Sir/Madam,

{opening_paragraph}

Facts of the Case:
{facts}

Legal Basis:
{legal_basis}

Demand:
{demand_statement}

Yours faithfully,
{sender_name}
{sender_credentials}""",
            
            "legal_notice": """LEGAL NOTICE
UNDER SECTION 80 CPC / SECTION 138 NI ACT

To,
{recipient_details}

SUBJECT: NOTICE UNDER SECTION {section} OF {act}

Sir/Madam,

Under instructions from my client, {client_name}, I hereby serve you with the following legal notice:

1. {fact_1}
2. {fact_2}
3. {fact_3}

I hereby call upon you to {demand} within {timeframe} days from the receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings against you at your risk as to costs and consequences.

Date: {date}
Place: {place}

(Signature)
{advocate_name}
Advocate""",

            "vakalatnama": """VAKALATNAMA
IN THE COURT OF {court_name} AT {place}
SUIT / PETITION NO. ______ OF 20__

{plaintiff_name} ... Plaintiff / Petitioner
VERSUS
{defendant_name} ... Defendant / Respondent

I / We, {client_name}, the above named do hereby appoint and retain:

{advocate_name}
Advocate, High Court

to appear, plead and act for me/us in the above matter, to file written statements, documents, and petitions, and to do all acts necessary for the prosecution/defense of this case.

Dated this ___ day of _______, 20__.

ACCEPTED                             EXECUTED
(Advocate's Signature)               (Client's Signature)""",

            "rti_application": """APPLICATION UNDER RIGHT TO INFORMATION ACT, 2005

To,
The Public Information Officer (PIO),
{department_name},
{address}

1. Name of Applicant: {applicant_name}
2. Address: {applicant_address}
3. Particulars of Information Required:
   (a) Subject matter of information: {subject}
   (b) Period to which information relates: {period}
   (c) Description of information required:
       {details_of_info}

4. Whether information is required by post or in person: {delivery_mode}
5. In case by post, pay order number: {payment_details}

Date: {date}
Place: {place}

(Signature of Applicant)""",

            "bail_application": """IN THE COURT OF {judge_designation}, {place}
BAIL APPLICATION NO. ______ OF 20__
IN FIR NO. {fir_no} UNDER SECTION {sections} OF {police_station}

{applicant_name} ... Applicant / Accused
VERSUS
State of {state} ... Respondent

APPLICATION UNDER SECTION 437/439 OF CODE OF CRIMINAL PROCEDURE FOR GRANT OF BAIL

MOST RESPECTFULLY SHOWETH:

1. That the applicant has been falsely implicated in the above-mentioned case.
2. That the applicant was arrested on {arrest_date} and is currently in judicial custody.
3. That the investigation is complete / ongoing and no recovery is to be effected from the applicant.
4. That the applicant undertakes to abide by all terms and conditions imposed by this Hon'ble Court.
5. {additional_grounds}

PRAYER
It is therefore permitted that the applicant be released on bail in the interest of justice.

(Counsel for Applicant)
{advocate_name}""",

            "blank": ""  # Empty for blank documents
        }

    def generate(self, case_id: str, instructions: str) -> str:
        """
        Generates a legal document based on the case context and specific instructions.
        Uses the existing RAG pipeline but adapts the prompt via the query.
        """
        # tailored query to force the RAG to act as a drafter
        rag_query = (
            f"You are a legal assistant. Draft a document based on these instructions: '{instructions}'. "
            f"Use the provided context about the case to fill in details. "
            f"Return ONLY the document content, properly formatted."
        )
        
        # boosting top_k to ensure we get enough context for a full document
        result = ask(query=rag_query, case_id=case_id, top_k=20)
        
        return result.answer

    def generate_conversational(
        self, 
        case_id: str, 
        message: str, 
        current_document: str,
        history: List[Dict],
        template: Optional[str] = "blank"
    ) -> Dict[str, str]:
        """
        Conversational document generation that returns both AI message and updated document.
        
        Args:
            case_id: Case ID for RAG context
            message: User's conversational message
            current_document: Current state of the document
            history: Previous conversation messages
            template: Template type (noc, demand_letter, etc.)
            
        Returns:
            Dict with 'ai_message' (conversational response) and 'document_content' (updated document)
        """
        
        # Build context from conversation history
        conversation_context = "\n".join([
            f"{msg['role']}: {msg['content']}" for msg in history
        ])
        
        # Get template if specified
        template_content = self.templates.get(template, "") if template != "blank" else ""
        
        # Determine if this is initial generation or refinement
        is_initial = not current_document or len(current_document.strip()) < 50
        
        if is_initial:
            # Initial document generation
            query = f"""You are a legal assistant helping draft a document interactively.

Template type: {template}
User request: {message}

Based on the case context and user's request, do TWO things:
1. Respond conversationally to acknowledge what you're doing and ask for any needed clarifications
2. Generate an initial draft of the document

Previous conversation:
{conversation_context}

Format your response EXACTLY as follows:
CHAT: [Your conversational response to the user]
DOCUMENT: [The actual document content]

Be helpful and professional. If you need more information, ask specific questions."""
        else:
            # Refinement of existing document
            query = f"""You are a legal assistant helping refine a document interactively.

Current document:
{current_document}

User request: {message}

Previous conversation:
{conversation_context}

Based on the user's request and case context, do TWO things:
1. Respond conversationally to acknowledge what changes you're making
2. Provide the COMPLETE updated document with the requested changes

Format your response EXACTLY as follows:
CHAT: [Your conversational response explaining the changes]
DOCUMENT: [The complete updated document]

Ensure you return the FULL document, not just the changed parts."""

        # Use RAG to generate response with case context
        result = ask(query=query, case_id=case_id, top_k=15)
        response_text = result.answer
        
        # Parse the response to extract chat and document parts
        ai_message = ""
        document_content = current_document  # Fallback to current if parsing fails
        
        try:
            # Split by CHAT: and DOCUMENT: markers
            if "CHAT:" in response_text and "DOCUMENT:" in response_text:
                parts = response_text.split("DOCUMENT:")
                chat_part = parts[0].replace("CHAT:", "").strip()
                doc_part = parts[1].strip()
                
                ai_message = chat_part
                document_content = doc_part
            else:
                # Fallback: treat entire response as document if markers not found
                # Try to detect if it's conversational or document-like
                if len(response_text) < 200 or "?" in response_text[:100]:
                    # Likely conversational
                    ai_message = response_text
                    # Keep current document or use template
                    if is_initial and template_content:
                        document_content = template_content
                else:
                    # Likely a document
                    ai_message = "I've generated the document based on your request."
                    document_content = response_text
        except Exception as e:
            print(f"Error parsing response: {e}")
            ai_message = "I've updated the document. Please review it."
            document_content = response_text if response_text else current_document
        
        return {
            "ai_message": ai_message,
            "document_content": document_content
        }
