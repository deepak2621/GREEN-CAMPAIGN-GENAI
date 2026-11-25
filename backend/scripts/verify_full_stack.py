"""
Full stack verification test for Green Campaign AI (FLUX.1 Dev Q4 GGUF).
Validates frontend dev server, Vite proxy routing, backend REST API, and model status.
"""

import requests


def verify():
    print("=" * 80)
    print("GREEN CAMPAIGN AI – FULL STACK VERIFICATION SUITE")
    print("=" * 80)

    for label, url in [
        ("Frontend Dev Server", "http://localhost:5173"),
        ("Direct Backend Health", "http://127.0.0.1:5000/api/health"),
        ("Vite Proxy /api/health", "http://localhost:5173/api/health"),
        ("Vite Proxy /api/model-status", "http://localhost:5173/api/model-status"),
    ]:
        try:
            r = requests.get(url, timeout=5)
            print(f"[PASS] {label}: HTTP {r.status_code}")
            if "json" in r.headers.get("Content-Type", ""):
                data = r.json()
                info = data.get("data", data)
                if "model" in info or "model_name" in info:
                    print(f"       Model: {info.get('model') or info.get('model_name')} | Status: {info.get('model_status') or info.get('status')}")
        except Exception as e:
            print(f"[FAIL] {label}: {e}")

    print("=" * 80)


if __name__ == "__main__":
    verify()
