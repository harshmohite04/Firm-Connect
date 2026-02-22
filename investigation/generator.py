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

Under Section {section} of {act}

To,
{recipient_details}

Notice is hereby served upon you on behalf of {client_name} regarding {matter}.

{notice_body}

Take notice that if the above demands are not complied with within {timeframe}, legal proceedings will be initiated without further reference.

Date: {date}
Place: {place}

{advocate_details}""",
            
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
            # Refinement of existing document — prepend line numbers for precise references
            numbered_lines = [f"{i}: {line}" for i, line in enumerate(current_document.split('\n'), start=1)]
            numbered_document = '\n'.join(numbered_lines)

            query = f"""You are a legal assistant helping refine a document interactively.

Current document (with line numbers for reference):
{numbered_document}

Line numbers are for reference only. Do NOT include line numbers in the output document. When the user references a line number, use it to locate the text.

User request: {message}

Previous conversation:
{conversation_context}

Based on the user's request and case context, do TWO things:
1. Respond conversationally to acknowledge what changes you're making
2. Provide the COMPLETE updated document with the requested changes

Format your response EXACTLY as follows:
CHAT: [Your conversational response explaining the changes]
DOCUMENT: [The complete updated document]

Ensure you return the FULL document, not just the changed parts. Do NOT include line numbers in the DOCUMENT output."""

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
