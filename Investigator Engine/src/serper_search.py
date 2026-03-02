"""Serper web search integration for Preset A (DeepSeek mode)"""
import os
import requests
from typing import Optional, Dict, Any, List


def serper_web_search(query: str, num_results: int = 10) -> str:
    """
    Execute a web search using Serper.dev API.

    Args:
        query: Search query string
        num_results: Number of results to return (default 10)

    Returns:
        Formatted search results as a string (compatible with legal researcher input)
    """
    api_key = os.getenv("SERPER_API_KEY")
    if not api_key:
        return f"[ERROR] SERPER_API_KEY not configured. Cannot perform web search for: {query}"

    try:
        url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "q": query,
            "num": min(num_results, 10),  # Serper API max is 10
        }

        response = requests.post(url, json=payload, headers=headers, timeout=10)

        if response.status_code != 200:
            return f"[ERROR] Serper API returned status {response.status_code}: {response.text}"

        data = response.json()

        # Extract and format results
        results = []
        if "organic" in data:
            for i, result in enumerate(data["organic"][:num_results], 1):
                title = result.get("title", "")
                link = result.get("link", "")
                snippet = result.get("snippet", "")

                formatted_result = f"{i}. **{title}**\n   URL: {link}\n   {snippet}\n"
                results.append(formatted_result)

        # Include answer box if available
        answer_box = data.get("answerBox", {})
        formatted_results = ""
        if answer_box:
            formatted_results += f"**Answer Box:**\n{answer_box.get('answer', answer_box.get('type', 'N/A'))}\n\n"

        formatted_results += "\n".join(results) if results else "[No relevant results found]"

        return formatted_results

    except requests.exceptions.Timeout:
        return f"[ERROR] Serper search timed out for query: {query}"
    except requests.exceptions.RequestException as e:
        return f"[ERROR] Serper search failed: {str(e)}"
    except Exception as e:
        return f"[ERROR] Unexpected error during Serper search: {str(e)}"


def get_serper_search():
    """Return a callable search function for integration with LangChain agents."""
    return serper_web_search
