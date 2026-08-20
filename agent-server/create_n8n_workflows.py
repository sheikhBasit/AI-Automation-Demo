"""
create_n8n_workflows.py - Creates both n8n workflows via REST API using requests.Session
"""
import requests, json, os, sys

N8N_URL = os.environ.get("N8N_URL", "http://localhost:5678")
N8N_EMAIL = os.environ["N8N_EMAIL"]
N8N_PASSWORD = os.environ["N8N_PASSWORD"]

# Set up a Google Sheets service account credential in the n8n UI first, then
# fill these in (or export as env vars) — n8n credentials can't be created via this API.
GOOGLE_SHEETS_SPREADSHEET_ID = os.environ.get("GOOGLE_SHEETS_SPREADSHEET_ID", "")
GOOGLE_SHEETS_CREDENTIAL_ID = os.environ.get("GOOGLE_SHEETS_CREDENTIAL_ID", "")

# Same idea for Google Calendar — set up the OAuth2 credential in the n8n UI first.
GOOGLE_CALENDAR_ID = os.environ.get("GOOGLE_CALENDAR_ID", "")
GOOGLE_CALENDAR_CREDENTIAL_ID = os.environ.get("GOOGLE_CALENDAR_CREDENTIAL_ID", "")

# host.docker.internal works on Docker Desktop (Mac/Windows). On plain Linux
# Docker it doesn't resolve — set this to the bridge gateway IP instead
# (`docker network inspect agent-server_default` -> Gateway, often 172.20.0.1).
HOST_GATEWAY = os.environ.get("N8N_HOST_GATEWAY", "host.docker.internal")

session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

def login():
    resp = session.post(f"{N8N_URL}/rest/login",
        json={"emailOrLdapLoginId": N8N_EMAIL, "password": N8N_PASSWORD})
    if resp.status_code != 200:
        print(f"❌ Login failed: {resp.status_code} {resp.text}"); sys.exit(1)
    print("✅ Logged in to n8n")

WORKFLOW_1 = {
    "name": "Order Placed — Trigger AI Call",
    "nodes": [
        {"id":"wh1","name":"Order Placed Webhook","type":"n8n-nodes-base.webhook",
         "typeVersion":2,"position":[240,300],"webhookId":"order-placed-wh",
         "parameters":{"httpMethod":"POST","path":"order-placed",
                        "responseMode":"onReceived","responseData":"firstEntryJson"}},
        {"id":"hr1","name":"Trigger AI Agent Call","type":"n8n-nodes-base.httpRequest",
         "typeVersion":4.2,"position":[480,300],
         "parameters":{"method":"POST",
                        "url":f"http://{HOST_GATEWAY}:8000/initiate-call",
                        "sendBody":True,"bodyContentType":"json","specifyBody":"json",
                        "jsonBody":'={\n  "orderId": "{{ $json.body.orderId }}",\n  "customerName": "{{ $json.body.customerName }}",\n  "customerPhone": "{{ $json.body.customerPhone }}",\n  "address": "{{ $json.body.address }}",\n  "total": {{ $json.body.total }},\n  "items": {{ JSON.stringify($json.body.items) }}\n}',
                        "options":{}}},
        # matchingColumns/schema below must match an existing header row in the sheet —
        # on a fully empty sheet n8n's append silently dumps the raw input object
        # instead of these named columns. Seed row 1 with these exact headers first:
        # Order ID | Customer Name | Total | Status | Items
        {"id":"sh1","name":"Log Order to Sheets","type":"n8n-nodes-base.googleSheets",
         "typeVersion":4.5,"position":[480,460],
         "parameters":{"authentication":"serviceAccount","resource":"sheet","operation":"append",
                        "documentId":{"__rl":True,"mode":"id","value":GOOGLE_SHEETS_SPREADSHEET_ID},
                        "sheetName":{"__rl":True,"mode":"id","value":"gid=0"},
                        "columns":{"mappingMode":"defineBelow","matchingColumns":["Order ID"],
                                    "value":{
                                        "Order ID":"={{ $json.body.orderId }}",
                                        "Customer Name":"={{ $json.body.customerName }}",
                                        "Total":"={{ $json.body.total }}",
                                        "Status":"=PENDING",
                                        "Items":"={{ $json.body.items.map(i => i.quantity + 'x ' + (i.product ? i.product.name : i.productId)).join(', ') }}"
                                    }},
                        "options":{}},
         "credentials":{"googleApi":{"id":GOOGLE_SHEETS_CREDENTIAL_ID,"name":"Google Service Account account"}}}
    ],
    "connections":{"Order Placed Webhook":{"main":[[{"node":"Trigger AI Agent Call","type":"main","index":0},
                                                       {"node":"Log Order to Sheets","type":"main","index":0}]]}},
    "active":False,"settings":{"executionOrder":"v1"}
}

WORKFLOW_2 = {
    "name": "Call Result Handler — Update Order",
    "nodes": [
        {"id":"wh2","name":"Call Result Webhook","type":"n8n-nodes-base.webhook",
         "typeVersion":2,"position":[240,300],"webhookId":"call-result-wh",
         "parameters":{"httpMethod":"POST","path":"call-result",
                        "responseMode":"onReceived","responseData":"firstEntryJson"}},
        {"id":"if1","name":"Was Order Confirmed?","type":"n8n-nodes-base.if",
         "typeVersion":2,"position":[480,300],
         "parameters":{"conditions":{"options":{"caseSensitive":True,"leftValue":"","typeValidation":"strict"},
                        "conditions":[{"leftValue":"={{ $json.body.confirmed }}","rightValue":True,
                                       "operator":{"type":"boolean","operation":"true"}}],
                        "combinator":"and"}}},
        {"id":"hr2","name":"Mark Order CONFIRMED","type":"n8n-nodes-base.httpRequest",
         "typeVersion":4.2,"position":[720,160],
         "parameters":{"method":"PATCH",
                        "url":f"=http://{HOST_GATEWAY}:3000/api/orders/{{{{ $json.body.orderId }}}}",
                        "sendBody":True,"bodyContentType":"json","specifyBody":"json",
                        "jsonBody":'{\n  "status": "CONFIRMED",\n  "callStatus": "CONFIRMED_BY_CALL"\n}',
                        "options":{}}},
        {"id":"hr3","name":"Mark Order CANCELLED","type":"n8n-nodes-base.httpRequest",
         "typeVersion":4.2,"position":[720,460],
         "parameters":{"method":"PATCH",
                        "url":f"=http://{HOST_GATEWAY}:3000/api/orders/{{{{ $json.body.orderId }}}}",
                        "sendBody":True,"bodyContentType":"json","specifyBody":"json",
                        "jsonBody":'{\n  "status": "CANCELLED",\n  "callStatus": "CANCELLED_BY_CALL"\n}',
                        "options":{}}},
        # Same header-row caveat as WF1's Log Order to Sheets: matches existing
        # rows by "Order ID" — the row must already exist (WF1 appends it first).
        {"id":"sh2","name":"Update Sheet CONFIRMED","type":"n8n-nodes-base.googleSheets",
         "typeVersion":4.5,"position":[960,200],
         "parameters":{"authentication":"serviceAccount","resource":"sheet","operation":"update",
                        "documentId":{"__rl":True,"mode":"id","value":GOOGLE_SHEETS_SPREADSHEET_ID},
                        "sheetName":{"__rl":True,"mode":"id","value":"gid=0"},
                        "columns":{"mappingMode":"defineBelow","matchingColumns":["Order ID"],
                                    "value":{
                                        "Order ID":"={{ $json.body.orderId }}",
                                        "Status":"=CONFIRMED",
                                        "Items":"={{ $json.body.items.map(i => i.quantity + 'x ' + (i.product ? i.product.name : i.productId)).join(', ') }}"
                                    }},
                        "options":{}},
         "credentials":{"googleApi":{"id":GOOGLE_SHEETS_CREDENTIAL_ID,"name":"Google Service Account account"}}},
        {"id":"sh3","name":"Update Sheet CANCELLED","type":"n8n-nodes-base.googleSheets",
         "typeVersion":4.5,"position":[960,420],
         "parameters":{"authentication":"serviceAccount","resource":"sheet","operation":"update",
                        "documentId":{"__rl":True,"mode":"id","value":GOOGLE_SHEETS_SPREADSHEET_ID},
                        "sheetName":{"__rl":True,"mode":"id","value":"gid=0"},
                        "columns":{"mappingMode":"defineBelow","matchingColumns":["Order ID"],
                                    "value":{
                                        "Order ID":"={{ $json.body.orderId }}",
                                        "Status":"=CANCELLED",
                                        "Items":"={{ $json.body.items.map(i => i.quantity + 'x ' + (i.product ? i.product.name : i.productId)).join(', ') }}"
                                    }},
                        "options":{}},
         "credentials":{"googleApi":{"id":GOOGLE_SHEETS_CREDENTIAL_ID,"name":"Google Service Account account"}}},
        # Start/End default to "right now, one hour" since there's no delivery-date
        # field on the order yet — swap for a real scheduled time if one gets added.
        {"id":"gc1","name":"Create an event","type":"n8n-nodes-base.googleCalendar",
         "typeVersion":1.3,"position":[1184,208],
         "parameters":{"calendar":{"__rl":True,"mode":"list","value":GOOGLE_CALENDAR_ID,
                                    "cachedResultName":GOOGLE_CALENDAR_ID},
                        "start":"={{ $now }}",
                        "end":"={{ $now.plus(1, 'hours') }}",
                        "additionalFields":{
                            "summary":"=Order Placed - {{ $json.body.customerName }} (#{{ $json.body.orderId }})"
                        }},
         "credentials":{"googleCalendarOAuth2Api":{"id":GOOGLE_CALENDAR_CREDENTIAL_ID,"name":"Google Calendar account"}}}
    ],
    "connections":{
        "Call Result Webhook":{"main":[[{"node":"Was Order Confirmed?","type":"main","index":0}]]},
        "Was Order Confirmed?":{"main":[
            [{"node":"Mark Order CONFIRMED","type":"main","index":0},
             {"node":"Update Sheet CONFIRMED","type":"main","index":0}],
            [{"node":"Mark Order CANCELLED","type":"main","index":0},
             {"node":"Update Sheet CANCELLED","type":"main","index":0}]
        ]},
        "Update Sheet CONFIRMED":{"main":[[{"node":"Create an event","type":"main","index":0}]]}
    },
    "active":False,"settings":{"executionOrder":"v1"}
}

def create_workflow(wf):
    resp = session.post(f"{N8N_URL}/rest/workflows", json=wf)
    if resp.status_code not in (200,201):
        print(f"❌ Failed '{wf['name']}': {resp.status_code} {resp.text}"); sys.exit(1)
    data = resp.json()["data"]
    print(f"✅ Created: {data['name']} (id={data['id']})")
    return data

def activate_workflow(wf_id, name):
    resp = session.patch(f"{N8N_URL}/rest/workflows/{wf_id}", json={"active":True})
    if resp.status_code == 200: print(f"⚡ Activated: {name}")
    else: print(f"⚠️  Activate manually: {name} ({resp.status_code})")

def update_env(filepath, key, value):
    if not os.path.exists(filepath): print(f"⚠️  Not found: {filepath}"); return
    lines = open(filepath).readlines()
    updated = False
    new_lines = []
    for line in lines:
        if line.startswith(f"{key}="):
            new_lines.append(f'{key}="{value}"\n'); updated = True
        else:
            new_lines.append(line)
    if not updated: new_lines.append(f'{key}="{value}"\n')
    open(filepath,"w").writelines(new_lines)
    print(f"📝 Updated {key} in {os.path.basename(filepath)}")

def main():
    login()
    print("\n📋 Creating Workflow 1: Order Placed...")
    wf1 = create_workflow(WORKFLOW_1)
    activate_workflow(wf1["id"], wf1["name"])
    url1 = f"{N8N_URL}/webhook/order-placed"

    print("\n📋 Creating Workflow 2: Call Result Handler...")
    wf2 = create_workflow(WORKFLOW_2)
    activate_workflow(wf2["id"], wf2["name"])
    url2 = f"{N8N_URL}/webhook/call-result"

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    print("\n📝 Updating .env files...")
    update_env(os.path.join(project_dir,".env"), "N8N_WEBHOOK_URL", url1)
    update_env(os.path.join(project_dir,".env"), "N8N_CALL_RESULT_WEBHOOK", url2)
    update_env(os.path.join(script_dir,".env"), "N8N_CALL_RESULT_URL", url2)

    print(f"\n🎉 Done!\n   WF1 (N8N_WEBHOOK_URL):      {url1}\n   WF2 (N8N_CALL_RESULT_URL):  {url2}\n   Open n8n: {N8N_URL}\n")

    if not GOOGLE_SHEETS_SPREADSHEET_ID or not GOOGLE_SHEETS_CREDENTIAL_ID:
        print("⚠️  Sheets nodes created but not configured:\n"
              "   1. In n8n, add a Google Sheets *service account* credential (type\n"
              "      'Google Service Account', not OAuth2) using a GCP service account JSON key.\n"
              "   2. Share the target spreadsheet with that service account's client_email.\n"
              "   3. Seed row 1 of the sheet with headers: Order ID | Customer Name | Total | Status | Items\n"
              "      (the append/update nodes match columns by name — an empty sheet or wrong\n"
              "      headers makes them silently write garbage or no-op instead of erroring).\n"
              "   4. Re-run with GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SHEETS_CREDENTIAL_ID set,\n"
              "      or open each Sheets node in the n8n UI and set the credential/spreadsheet.\n"
              "   Also set N8N_HOST_GATEWAY if 'host.docker.internal' doesn't resolve from your\n"
              "   n8n container (plain Linux Docker) — use the bridge gateway IP instead.")

    if not GOOGLE_CALENDAR_ID or not GOOGLE_CALENDAR_CREDENTIAL_ID:
        print("⚠️  Calendar node created but not configured:\n"
              "   1. In n8n, add a Google Calendar OAuth2 credential.\n"
              "   2. Re-run with GOOGLE_CALENDAR_ID and GOOGLE_CALENDAR_CREDENTIAL_ID set,\n"
              "      or open the 'Create an event' node in the n8n UI and set the\n"
              "      calendar/credential yourself.\n"
              "   Start/End default to \"now, +1 hour\" — there's no delivery-date field on\n"
              "   the order yet, so this just marks when the order was confirmed.")

if __name__ == "__main__":
    main()
