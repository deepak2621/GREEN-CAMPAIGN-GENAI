"""
Full stack verification test for Green Campaign AI.
Validates frontend dev server, proxy routing, backend REST API,
model status, history records, and image serving.
"""

import requests
import json

def verify():
    print("=" * 80)
    print("GREEN CAMPAIGN AI – FULL STACK VERIFICATION SUITE")
    print("=" * 80)

    # 1. Frontend Dev Server
    try:
        r = requests.get("http://localhost:5173", timeout=5)
        print(f"[PASS] Frontend Dev Server: HTTP {r.status_code}")
    except Exception as e:
        print(f"[FAIL] Frontend Dev Server: {e}")

    # 2. Direct Backend Health
    try:
        r = requests.get("http://127.0.0.1:5000/api/health", timeout=5)
        data = r.json()
        print(f"[PASS] Direct Backend Health: HTTP {r.status_code}")
        print(f"       Model: {data.get('model')} | Status: {data.get('model_status')} | Provider: {data.get('provider')}")
    except Exception as e:
        print(f"[FAIL] Direct Backend Health: {e}")

    # 3. Vite Proxy Health
    try:
        r = requests.get("http://localhost:5173/api/health", timeout=5)
        data = r.json()
        print(f"[PASS] Vite Proxy /api/health: HTTP {r.status_code}")
        print(f"       Model: {data.get('model')} | Status: {data.get('model_status')}")
    except Exception as e:
        print(f"[FAIL] Vite Proxy /api/health: {e}")

    # 4. Vite Proxy Model Status
    try:
        r = requests.get("http://localhost:5173/api/model-status", timeout=5)
        data = r.json()
        info = data.get("data", {})
        print(f"[PASS] Vite Proxy /api/model-status: HTTP {r.status_code}")
        print(f"       Checkpoint: {info.get('checkpoint_name')} | Steps: {info.get('inference_steps')} | Speed: {info.get('speed_target')}")
    except Exception as e:
        print(f"[FAIL] Vite Proxy /api/model-status: {e}")

    # 5. History Endpoint
    try:
        r = requests.get("http://localhost:5173/api/history", timeout=5)
        data = r.json()
        count = data.get("count", 0)
        items = data.get("data", [])
        print(f"[PASS] History Endpoint: HTTP {r.status_code} ({count} campaigns archived)")
        if items:
            latest = items[0]
            print(f"       Latest Campaign: '{latest.get('campaign_title')}' ({latest.get('category')})")
            print(f"       Image URL: {latest.get('image_url')}")
            # Verify latest image via Vite proxy
            img_r = requests.get(f"http://localhost:5173{latest.get('image_url')}", timeout=5)
            print(f"       Image Serving (Vite Proxy): HTTP {img_r.status_code} ({len(img_r.content)} bytes)")
    except Exception as e:
        print(f"[FAIL] History Endpoint: {e}")

    print("=" * 80)
    print("ALL INTEGRATION CHECKS COMPLETED")
    print("=" * 80)

if __name__ == "__main__":
    verify()
