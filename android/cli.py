import os
import sys
import json
import time
import requests
import xml.etree.ElementTree as ET

SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
CRED_FILE = os.path.join(SCRIPT_DIR, "credentials.json")
ENDPOINT = "http://172.16.68.6:8090/httpclient.html"


def load_credentials():
    if not os.path.exists(CRED_FILE):
        return []
    try:
        with open(CRED_FILE) as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except:
        pass
    return []


def save_credentials(creds):
    with open(CRED_FILE, "w") as f:
        json.dump(creds, f, indent=2)


def add_credentials(creds):
    print("Enter new credentials (blank username to stop).")
    while True:
        u = input("Username: ").strip()
        if not u:
            break
        p = input("Password: ")
        creds.append({"username": u, "password": p})
        print(f"➕ Added {u}")
    save_credentials(creds)
    print(f"💾 Stored {len(creds)} credential(s).")


def login(creds):
    for cred in creds:
        print(f"🔄 Trying login for {cred['username']}…")
        payload = {
            "mode": "191",
            "username": cred["username"],
            "password": cred["password"],
            "a": str(int(time.time() * 1000)),
        }
        try:
            r = requests.post(ENDPOINT, data=payload, timeout=10)
            r.raise_for_status()
            root = ET.fromstring(r.content)
            msg = root.findtext("message", "").strip()
        except Exception as e:
            print(f"❗ Error: {e}")
            continue
        if "Login failed" in msg:
            print(f"❌ {cred['username']}: {msg}")
        elif "signed in" in msg.lower():
            print(f"✅ Success: {cred['username']}")
            return True
        else:
            print(f"⚠️ Unknown: {msg}")
    print("🔴 All login attempts failed.")
    return False


def logout(creds):
    ok = 0
    for cred in creds:
        print(f"🔄 Logging out {cred['username']}…")
        payload = {
            "mode": "193",
            "username": cred["username"],
            "password": cred["password"],
            "a": str(int(time.time() * 1000)),
        }
        try:
            r = requests.post(ENDPOINT, data=payload, timeout=10)
            r.raise_for_status()
            root = ET.fromstring(r.content)
            msg = root.findtext("message", "").strip()
        except Exception as e:
            print(f"❗ Error: {e}")
            continue
        if "signed out" in msg.lower():
            print(f"✅ Logged out {cred['username']}")
            ok += 1
        else:
            print(f"⚠️ {cred['username']}: {msg}")
    print(f"📊 Done: {ok}/{len(creds)} logged out.")


def main():
    creds = load_credentials()
    if not creds:
        print("ℹ️ No credentials stored—let’s add some.")
        add_credentials(creds)
    print(f"ℹ️ You have {len(creds)} credential(s) stored.")
    while True:
        cmd = input("[l]ogin, [o]ut, [a]dd, [q]uit: ").lower().strip()
        if cmd == "l":
            login(creds)
        elif cmd == "o":
            logout(creds)
        elif cmd == "a":
            add_credentials(creds)
        elif cmd == "q":
            sys.exit(0)
        else:
            print("❓ Invalid option.")


if __name__ == "__main__":
    main()
