import os
import httpx
from urllib.parse import urlsplit, urlunsplit

def _to_internal_url(url: str) -> str:
    """n8n's resume URL uses its browser-facing host (needed for the Google
    OAuth redirect URI to stay valid), which doesn't resolve from inside this
    container. Swap in N8N_INTERNAL_URL's host, keep the resume path/token."""
    internal_base = os.getenv("N8N_INTERNAL_URL")
    if not internal_base:
        return url
    parts, internal = urlsplit(url), urlsplit(internal_base)
    return urlunsplit((internal.scheme, internal.netloc, parts.path, parts.query, parts.fragment))

async def _post_result(order_id: str, order_data: dict | None, confirmed: bool):
    """POST the call result back to n8n (per-order resume URL, or the
    fixed webhook as a fallback), or PATCH the order directly if n8n
    isn't wired up at all."""
    callback_url = (order_data or {}).get("callbackUrl") or os.getenv("N8N_CALL_RESULT_URL")
    if callback_url:
        callback_url = _to_internal_url(callback_url)
        payload = {**(order_data or {}), "orderId": order_id, "confirmed": confirmed}
        async with httpx.AsyncClient() as client:
            try:
                await client.post(callback_url, json=payload)
            except Exception as e:
                print(f"Failed to post call result to {callback_url}: {e}")
    else:
        nextjs_url = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
        status = "CONFIRMED" if confirmed else "CANCELLED"
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{nextjs_url}/api/orders/{order_id}",
                json={"status": status, "callStatus": f"{status}_BY_CALL"}
            )

async def confirm_order(order_id: str, order_data: dict | None = None):
    """Tool for the LLM to confirm the order."""
    await _post_result(order_id, order_data, confirmed=True)
    return "Order has been confirmed."

async def cancel_order(order_id: str, order_data: dict | None = None):
    """Tool for the LLM to cancel the order."""
    await _post_result(order_id, order_data, confirmed=False)
    return "Order has been cancelled."
