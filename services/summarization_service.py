"""Lightweight conversation summarization for long chat contexts."""

from utils.error_handler import logger


def summarize_conversation(messages: list, client, model: str) -> str:
    """Summarize older conversation messages into a concise context summary.

    Args:
        messages: List of message dicts with 'role' and 'content' keys.
        client: OpenAI-compatible client instance.
        model: Model name to use for summarization.

    Returns:
        A concise summary string of the conversation.
    """
    if not messages:
        return ""

    prompt = "Summarize the key points of this conversation concisely, preserving important facts, decisions, and context needed for follow-up questions:\n\n"
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        # Truncate very long messages for the summary prompt
        if len(content) > 1000:
            content = content[:1000] + "..."
        prompt += f"{role}: {content}\n\n"

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        summary = response.choices[0].message.content
        logger.info(f"Conversation summarized: {len(messages)} messages -> {len(summary)} chars")
        return summary
    except Exception as e:
        logger.error(f"Summarization failed: {e}", exc_info=True)
        # Fallback: return a simple truncated concatenation
        fallback = " | ".join(
            f"{m.get('role', 'user')}: {m.get('content', '')[:100]}"
            for m in messages[-5:]
        )
        return f"[Previous context summary unavailable. Recent messages: {fallback}]"
