#!/usr/bin/env python3
"""
Generate secure keys for VoiceAI Platform.

Outputs KEY=VALUE pairs suitable for appending to .env.
Usage:
    python3 scripts/generate-keys.py
    python3 scripts/generate-keys.py >> .env
"""

import secrets
import sys


def generate_secret_key(length: int = 64) -> str:
    """Generate a cryptographically random hex string for SECRET_KEY."""
    return secrets.token_hex(length)


def generate_fernet_key() -> str:
    """
    Generate a valid Fernet key.
    Fernet keys are 32 random bytes encoded as URL-safe base64 (44 chars with padding).
    Requires: pip install cryptography
    Falls back to a urandom-based key if cryptography is not installed.
    """
    try:
        from cryptography.fernet import Fernet
        return Fernet.generate_key().decode()
    except ImportError:
        # Fallback: generate manually (same format as Fernet.generate_key)
        import base64
        import os
        return base64.urlsafe_b64encode(os.urandom(32)).decode()


def main() -> None:
    secret_key = generate_secret_key()
    encryption_key = generate_fernet_key()

    print(f"SECRET_KEY={secret_key}")
    print(f"ENCRYPTION_KEY={encryption_key}")

    # Print a human-readable summary to stderr so it doesn't end up in .env
    print("\n# Keys generated successfully:", file=sys.stderr)
    print(f"#   SECRET_KEY     = {secret_key[:16]}...  ({len(secret_key)} chars)", file=sys.stderr)
    print(f"#   ENCRYPTION_KEY = {encryption_key[:16]}...  ({len(encryption_key)} chars)", file=sys.stderr)


if __name__ == "__main__":
    main()
