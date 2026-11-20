import base64
import binascii
import hashlib
import hmac
import json
import os
import time
from typing import Any, Dict, Optional

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer_scheme = HTTPBearer(auto_error=False)
DEMO_MODE = os.getenv("ENERGYQ_DEMO_MODE", "false").strip().lower() in {"1", "true", "yes"}
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def _decode_segment(segment: str) -> bytes:
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))


def verify_supabase_token(token: str) -> Dict[str, Any]:
    if not JWT_SECRET:
        raise HTTPException(status_code=503, detail="Server-side Supabase JWT verification is not configured.")
    try:
        header_part, payload_part, signature_part = token.split(".")
        header = json.loads(_decode_segment(header_part))
        claims = json.loads(_decode_segment(payload_part))
        if not isinstance(header, dict) or not isinstance(claims, dict):
            raise ValueError("Malformed JWT")
        if header.get("alg") != "HS256":
            raise ValueError("Unsupported JWT algorithm")
        signed = f"{header_part}.{payload_part}".encode("ascii")
        expected = hmac.new(JWT_SECRET.encode("utf-8"), signed, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _decode_segment(signature_part)):
            raise ValueError("Invalid JWT signature")
        if not claims.get("sub") or int(claims.get("exp", 0)) <= int(time.time()):
            raise ValueError("Expired or incomplete JWT")
        if claims.get("aud") not in (None, "authenticated"):
            raise ValueError("Invalid JWT audience")
        app_metadata = claims.get("app_metadata") or {}
        if not isinstance(app_metadata, dict):
            raise ValueError("Malformed application metadata")
        role = app_metadata.get("role")
        if role not in {"consumer", "operator"}:
            raise ValueError("Missing trusted application role")
        claims["role"] = role
        return claims
    except HTTPException:
        raise
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, UnicodeDecodeError, binascii.Error) as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token.") from exc


def authenticate_token(token: Optional[str], demo_role: Optional[str]) -> Dict[str, Any]:
    if token:
        return verify_supabase_token(token)
    if DEMO_MODE and demo_role in {"consumer", "operator"}:
        return {
            "sub": f"demo-{demo_role}",
            "role": demo_role,
            "user_metadata": {"meter_id": "BESCOM-IND-4092", "locality": "Indiranagar 2nd Stage"},
        }
    if not DEMO_MODE and not JWT_SECRET:
        raise HTTPException(status_code=503, detail="Authentication is not configured.")
    raise HTTPException(status_code=401, detail="Sign in to continue.")

def validate_consumer_scope(claims: Dict[str, Any]) -> Dict[str, Any]:
    if claims["sub"].startswith("demo-"):
        return claims
    app_metadata = claims.get("app_metadata") or {}
    if not isinstance(app_metadata, dict):
        raise HTTPException(status_code=401, detail="Invalid access token.")
    meter_id = app_metadata.get("meter_id")
    if meter_id != "BESCOM-IND-4092":
        raise HTTPException(status_code=403, detail="This account is not authorized for the linked smart meter.")
    return claims


def require_role(required_role: str):
    async def dependency(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
        demo_role: Optional[str] = Header(default=None, alias="X-EnergyQ-Demo-Role"),
    ) -> Dict[str, Any]:
        claims = authenticate_token(credentials.credentials if credentials else None, demo_role)
        if claims["role"] != required_role:
            raise HTTPException(status_code=403, detail=f"{required_role.title()} role required.")
        return claims
    return dependency


async def require_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    demo_role: Optional[str] = Header(default=None, alias="X-EnergyQ-Demo-Role"),
) -> Dict[str, Any]:
    return authenticate_token(credentials.credentials if credentials else None, demo_role)


async def require_consumer(
    claims: Dict[str, Any] = Depends(require_role("consumer")),
) -> Dict[str, Any]:
    return validate_consumer_scope(claims)


async def require_portal_user(claims: Dict[str, Any] = Depends(require_user)) -> Dict[str, Any]:
    return validate_consumer_scope(claims) if claims["role"] == "consumer" else claims
