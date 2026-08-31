import sys
from pathlib import Path

# Re-export the Flask app defined at the project root for Vercel's Python
# runtime to discover. Flask resolves templates/static relative to app.py's
# own location (not this file's), so nothing else needs to change.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import app  # noqa: E402,F401
