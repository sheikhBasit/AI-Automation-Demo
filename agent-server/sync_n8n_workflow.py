"""
sync_n8n_workflow.py - Push an exported n8n workflow JSON file to your n8n instance.

Updates the workflow if one with the same name already exists, otherwise
creates it. Use this instead of hand-transcribing exports into Python dicts:
edit the workflow in the n8n UI (or hand it to Claude to edit the file), then
run this to push it back.

Usage: python sync_n8n_workflow.py path/to/workflow.json
"""
import json, os, sys
import requests

N8N_URL = os.environ.get("N8N_URL", "http://localhost:5678")
N8N_EMAIL = os.environ["N8N_EMAIL"]
N8N_PASSWORD = os.environ["N8N_PASSWORD"]

# Fields n8n exports for reference but rejects (or ignores oddly) on write.
STRIP_FIELDS = ("id", "versionId", "meta", "pinData", "tags", "active", "nodeGroups")


def login(session):
    resp = session.post(f"{N8N_URL}/rest/login",
        json={"emailOrLdapLoginId": N8N_EMAIL, "password": N8N_PASSWORD})
    if resp.status_code != 200:
        print(f"❌ Login failed: {resp.status_code} {resp.text}"); sys.exit(1)


def find_by_name(session, name):
    resp = session.get(f"{N8N_URL}/rest/workflows")
    resp.raise_for_status()
    for wf in resp.json()["data"]:
        if wf["name"] == name:
            return wf["id"]
    return None


def main():
    if len(sys.argv) != 2:
        print("Usage: python sync_n8n_workflow.py <path-to-workflow.json>"); sys.exit(1)

    wf = json.load(open(sys.argv[1]))
    for field in STRIP_FIELDS:
        wf.pop(field, None)

    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    login(session)

    existing_id = find_by_name(session, wf["name"])
    if existing_id:
        resp = session.patch(f"{N8N_URL}/rest/workflows/{existing_id}", json=wf)
        action = "Updated"
    else:
        resp = session.post(f"{N8N_URL}/rest/workflows", json=wf)
        action = "Created"

    if resp.status_code not in (200, 201):
        print(f"❌ {action} failed: {resp.status_code} {resp.text}"); sys.exit(1)
    data = resp.json()["data"]
    print(f"✅ {action}: {data['name']} (id={data['id']})")


if __name__ == "__main__":
    main()
