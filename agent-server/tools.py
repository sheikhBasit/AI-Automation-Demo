import os
import httpx

async def confirm_order(order_id: str, order_data: dict | None = None):
    """Tool for the LLM to confirm the order."""
    n8n_url = os.getenv("N8N_CALL_RESULT_URL")
    if n8n_url:
        # order_data is forwarded so the n8n webhook has enough detail
        # (address, phone, items) to build the calendar event.
        payload = {**(order_data or {}), "orderId": order_id, "confirmed": True}
        async with httpx.AsyncClient() as client:
            try:
                await client.post(n8n_url, json=payload)
            except Exception as e:
                print(f"Failed to trigger n8n webhook: {e}")
    else:
        # Fallback to direct nextjs update for testing
        nextjs_url = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{nextjs_url}/api/orders/{order_id}",
                json={"status": "CONFIRMED", "callStatus": "CONFIRMED_BY_CALL"}
            )
    return "Order has been confirmed."

async def cancel_order(order_id: str):
    """Tool for the LLM to cancel the order."""
    n8n_url = os.getenv("N8N_CALL_RESULT_URL")
    if n8n_url:
        async with httpx.AsyncClient() as client:
            try:
                await client.post(n8n_url, json={"orderId": order_id, "confirmed": False})
            except Exception as e:
                print(f"Failed to trigger n8n webhook: {e}")
    else:
        nextjs_url = os.getenv("NEXTJS_API_URL", "http://localhost:3000")
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{nextjs_url}/api/orders/{order_id}",
                json={"status": "CANCELLED", "callStatus": "CANCELLED_BY_CALL"}
            )
    return "Order has been cancelled."
