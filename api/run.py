"""
KIYUMI — local dev entrypoint for the Printify fulfillment backend.

Freebuff production note: `api/*.py` is served by the platform's Python API
runner — this file is only for running the service locally:

    python api/run.py            # http://localhost:8080
"""
import os

from app import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
