import base64
import secrets
from dataclasses import dataclass
from cryptography.hazmat.primitives.asymmetric import x25519


@dataclass(frozen=True)
class RealityKeyPair:
    private_key: str
    public_key: str
    short_id: str


def generate_reality_keypair() -> RealityKeyPair:
    """Generate an X25519 keypair and short ID for Xray VLESS-Reality."""
    private_key = x25519.X25519PrivateKey.generate()
    raw_private: bytes = private_key.private_bytes_raw()
    raw_public: bytes = private_key.public_key().public_bytes_raw()

    # Xray Reality standard: base64 urlsafe without padding (43 chars)
    b64_private: str = base64.urlsafe_b64encode(raw_private).rstrip(b"=").decode("ascii")
    b64_public: str = base64.urlsafe_b64encode(raw_public).rstrip(b"=").decode("ascii")
    short_id: str = secrets.token_hex(8)

    return RealityKeyPair(
        private_key=b64_private,
        public_key=b64_public,
        short_id=short_id,
    )
