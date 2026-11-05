import os
import sys
import pytest

# Ensure backend root is on sys.path even when invoked without PYTHONPATH=.
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.db.init_db import init_database


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure database schema and extensions exist for all tests in fresh CI environments."""
    try:
        init_database()
    except Exception as e:
        print(f"Test database initialization notice: {e}")
