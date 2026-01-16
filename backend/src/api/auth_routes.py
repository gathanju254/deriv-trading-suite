# backend/src/api/auth_routes.py
# backend/src/api/auth_routes.py
from fastapi import APIRouter, HTTPException, Depends, Body, Header, Query, Request, Response, Cookie
from fastapi.responses import JSONResponse, RedirectResponse
from urllib.parse import urlencode, quote
from typing import Optional, Dict
import aiohttp
import secrets
import redis
from datetime import datetime, timedelta
import json
import os

from src.config.settings import settings
from src.db.session import SessionLocal
from src.db.models.user import User, UserSession
from src.db.repositories.user_settings_repo import UserSettingsRepo
from src.utils.logger import logger
from src.utils.security import create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Deriv endpoints
DERIV_OAUTH_AUTH_URL = "https://oauth.deriv.com/oauth2/authorize"
DERIV_OAUTH_TOKEN_URL = "https://oauth.deriv.com/oauth2/token"
DERIV_API_URL = "https://api.deriv.com"  # For token validation

# Redis for state storage (fallback to in-memory dict if Redis unavailable)
try:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        password=os.getenv("REDIS_PASSWORD", None),
        db=0,
        decode_responses=True
    )
    redis_client.ping()
    USE_REDIS = True
    logger.info("Redis connected for OAuth state storage")
except Exception:
    USE_REDIS = False
    # In-memory fallback (cleared on restart)
    state_storage: Dict[str, datetime] = {}
    logger.warning("Redis not available, using in-memory state storage (not production-safe)")

# -------------------------------------------------------------------
# State management utilities
# -------------------------------------------------------------------
def store_state(state: str, ttl_minutes: int = 5):
    """Store OAuth state with TTL"""
    expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)
    
    if USE_REDIS:
        redis_client.setex(f"oauth_state:{state}", ttl_minutes * 60, "valid")
    else:
        state_storage[state] = expires_at
    
    logger.debug(f"Stored OAuth state: {state}")

def validate_state(state: str) -> bool:
    """Validate OAuth state and consume it"""
    if not state:
        return False
    
    if USE_REDIS:
        key = f"oauth_state:{state}"
        exists = redis_client.get(key)
        if exists:
            redis_client.delete(key)
            return True
        return False
    else:
        # In-memory validation
        if state in state_storage:
            expires_at = state_storage[state]
            if expires_at > datetime.utcnow():
                del state_storage[state]
                return True
            else:
                del state_storage[state]  # Cleanup expired
        return False

def cleanup_expired_states():
    """Clean up expired in-memory states (for non-Redis fallback)"""
    if not USE_REDIS:
        now = datetime.utcnow()
        expired = [k for k, v in state_storage.items() if v < now]
        for key in expired:
            del state_storage[key]
        if expired:
            logger.debug(f"Cleaned up {len(expired)} expired OAuth states")

# -------------------------------------------------------------------
# Token validation utilities
# -------------------------------------------------------------------
async def validate_deriv_token(access_token: str) -> Optional[Dict]:
    """
    Validate Deriv access token and extract account info.
    Returns account info if valid, None if invalid.
    """
    try:
        async with aiohttp.ClientSession() as session:
            # Method 1: Try authorize endpoint (most reliable)
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Try to get account info
            async with session.post(
                f"{DERIV_API_URL}/authorize",
                json={"authorize": access_token},
                headers=headers
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if "authorize" in data and "error" not in data["authorize"]:
                        auth_data = data["authorize"]
                        return {
                            "account_id": auth_data.get("loginid"),
                            "email": auth_data.get("email"),
                            "currency": auth_data.get("currency"),
                            "country": auth_data.get("country"),
                            "fullname": auth_data.get("fullname"),
                            "verified": auth_data.get("is_virtual", 0) == 0,
                        }
                
                # Method 2: Try get_account_status as fallback
                async with session.post(
                    f"{DERIV_API_URL}/get_account_status",
                    json={"get_account_status": 1},
                    headers=headers
                ) as resp2:
                    if resp2.status == 200:
                        data = await resp2.json()
                        if "get_account_status" in data:
                            status_data = data["get_account_status"]
                            # Extract what we can
                            if "loginid" in status_data:
                                return {
                                    "account_id": status_data.get("loginid"),
                                    "email": None,
                                    "verified": True,
                                }
            
            # Method 3: Try to extract from token structure (last resort)
            if "_" in access_token:
                parts = access_token.split("_")
                if len(parts) >= 2:
                    return {
                        "account_id": parts[-1],
                        "email": f"{parts[-1]}@deriv.com",
                        "verified": False,  # Not actually verified
                    }
            
            return None
            
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return None

# -------------------------------------------------------------------
# Cookie utilities
# -------------------------------------------------------------------
def set_auth_cookies(
    response: Response,
    session_token: str,
    session_id: str,
    expires_hours: int = 24
):
    """Set secure HTTP-only cookies for authentication"""
    expires = datetime.utcnow() + timedelta(hours=expires_hours)
    
    # Main session token (HTTP-only, secure)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=not settings.DEBUG,  # Only HTTPS in production
        samesite="lax",
        max_age=expires_hours * 3600,
        path="/",
    )
    
    # Session ID for reference (not sensitive)
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=False,  # Can be read by JS
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=expires_hours * 3600,
        path="/",
    )
    
    # CSRF token for stateful operations
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,  # JS needs to read this for headers
        secure=not settings.DEBUG,
        samesite="strict",
        max_age=expires_hours * 3600,
        path="/",
    )
    
    # Store CSRF token in session for validation
    if USE_REDIS:
        redis_client.setex(f"csrf:{session_id}", expires_hours * 3600, csrf_token)
    # Note: In-memory CSRF storage would need Redis for production
    
    logger.debug(f"Auth cookies set for session: {session_id}")

def clear_auth_cookies(response: Response):
    """Clear all authentication cookies"""
    response.delete_cookie("session_token")
    response.delete_cookie("session_id")
    response.delete_cookie("csrf_token")
    logger.debug("Auth cookies cleared")

# -------------------------------------------------------------------
# DB dependency
# -------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------------------------------------------------
# LOGIN → frontend fetches URL, then redirects browser
# -------------------------------------------------------------------
@router.get("/login")
async def deriv_login(
    response: Response,
    db=Depends(get_db)
):
    """
    Returns Deriv OAuth URL.
    Frontend must redirect browser to this URL.
    Includes CSRF protection with state parameter.
    """
    try:
        # Generate and store state
        state = secrets.token_urlsafe(32)
        store_state(state)
        
        # Clean up expired states periodically
        cleanup_expired_states()
        
        # Create a temporary session for state tracking
        temp_session_id = secrets.token_urlsafe(16)
        
        params = {
            "app_id": settings.DERIV_APP_ID,
            "redirect_uri": settings.DERIV_OAUTH_REDIRECT_URI,
            "response_type": "token",
            "scope": "read write trade",
            "state": state,
            "brand": "deriv",
            "language": "EN",
        }

        auth_url = f"{DERIV_OAUTH_AUTH_URL}?{urlencode(params)}"
        logger.info(f"Deriv OAuth URL generated with state: {state[:8]}...")

        # Set a temporary cookie with the state for enhanced security
        response.set_cookie(
            key="oauth_state",
            value=state,
            httponly=True,
            secure=not settings.DEBUG,
            samesite="lax",
            max_age=300,  # 5 minutes
            path="/auth",
        )

        return JSONResponse({
            "redirect_url": auth_url,
            "state": state,
            "temp_session_id": temp_session_id
        })

    except Exception as e:
        logger.error(f"OAuth login generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate login URL")

# -------------------------------------------------------------------
# CALLBACK (POST) → Frontend posts token here (more secure)
# -------------------------------------------------------------------
@router.post("/callback")
async def deriv_callback_post(
    request: Request,
    response: Response,
    token_data: Dict = Body(...),
    db=Depends(get_db),
):
    """
    Secure callback endpoint that receives token via POST (not URL).
    Frontend should POST the token after extracting from URL fragment.
    """
    try:
        access_token = token_data.get("access_token")
        state = token_data.get("state")
        account_id = token_data.get("account_id")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="Missing access token")
        
        # Validate state if provided
        if state and not validate_state(state):
            logger.warning(f"Invalid or expired state: {state}")
            # We'll continue anyway but log it
        
        # ----------------------------
        # 1. Validate Deriv token
        # ----------------------------
        logger.info("Validating Deriv access token...")
        account_info = await validate_deriv_token(access_token)
        
        if not account_info:
            logger.error("Deriv token validation failed")
            raise HTTPException(status_code=401, detail="Invalid access token")
        
        # Use validated account ID
        validated_account_id = account_info.get("account_id", account_id)
        email = account_info.get("email") or f"{validated_account_id}@deriv.com"
        
        logger.info(f"Token validated for account: {validated_account_id}")
        
        # ----------------------------
        # 2. Create / update user
        # ----------------------------
        user = db.query(User).filter(User.deriv_account_id == validated_account_id).first()
        is_new_user = False

        if not user:
            logger.info(f"Creating new user for account {validated_account_id}")
            user = User(
                email=email,
                deriv_account_id=validated_account_id,
                is_active=True,
                username=account_info.get("fullname") or validated_account_id,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            is_new_user = True
            logger.info(f"User created with ID: {user.id}")
        else:
            user.last_login = datetime.utcnow()
            db.commit()
            logger.info(f"Existing user found: {user.id}")

        # ----------------------------
        # 3. Create default settings for new users
        # ----------------------------
        if is_new_user:
            try:
                user_settings = UserSettingsRepo.create_default_settings(user.id)
                logger.info(f"Default settings created for user {user.id}")
            except Exception as e:
                logger.error(f"Failed to create default settings for user {user.id}: {e}")
                # Don't fail the login if settings creation fails

        # ----------------------------
        # 4. Create session with refresh token support
        # ----------------------------
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        # Generate refresh token
        refresh_token = secrets.token_urlsafe(64)
        refresh_expires_at = datetime.utcnow() + timedelta(days=7)  # 7 days for refresh

        session_obj = UserSession(
            user_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            refresh_expires_at=refresh_expires_at,
            is_active=True,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(session_obj)
        db.commit()
        db.refresh(session_obj)
        logger.info(f"Session created: {session_obj.id}")

        # ----------------------------
        # 5. Create app JWT
        # ----------------------------
        app_token = create_access_token(
            {
                "sub": user.id,
                "session_id": session_obj.id,
                "email": user.email,
                "deriv_account_id": user.deriv_account_id,
                "is_new_user": is_new_user,
                "exp": int(expires_at.timestamp()),
            }
        )
        logger.info(f"App JWT created for user {user.id}")

        # ----------------------------
        # 6. Set secure cookies
        # ----------------------------
        set_auth_cookies(response, app_token, str(session_obj.id))

        return {
            "success": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "deriv_account_id": user.deriv_account_id,
                "is_new_user": is_new_user,
            },
            "session": {
                "id": str(session_obj.id),
                "expires_at": expires_at.isoformat(),
                "refresh_expires_at": refresh_expires_at.isoformat(),
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)[:100]}")

# -------------------------------------------------------------------
# CALLBACK (GET) → Legacy support for direct Deriv redirects
# -------------------------------------------------------------------
@router.get("/callback")
async def deriv_callback_get(
    request: Request,
    response: Response,
    acct1: Optional[str] = Query(None),
    token1: Optional[str] = Query(None),
    acct2: Optional[str] = Query(None),
    token2: Optional[str] = Query(None),
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db=Depends(get_db),
):
    """
    Legacy GET callback for direct Deriv redirects.
    This endpoint redirects to frontend with minimal data in URL.
    """
    try:
        logger.info(f"OAuth GET callback received with state: {state}")
        
        # Validate state parameter (CRITICAL for CSRF protection)
        if not state or not validate_state(state):
            logger.warning(f"Invalid or missing state parameter: {state}")
            # In production, you might want to be stricter here
            # return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=Invalid+state+parameter")
        
        access_token: Optional[str] = None
        account_id: Optional[str] = None

        # Resolve access token and account ID
        if token1 and acct1:
            access_token = token1
            account_id = acct1
            logger.info("Using token1 flow")
        elif token2 and acct2:
            access_token = token2
            account_id = acct2
            logger.info("Using token2 flow")
        elif code:
            logger.info("Using code flow")
            async with aiohttp.ClientSession() as session:
                token_data = {
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.DERIV_APP_ID,
                    "redirect_uri": settings.DERIV_OAUTH_REDIRECT_URI,
                }
                async with session.post(DERIV_OAUTH_TOKEN_URL, data=token_data) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        logger.error(f"Token exchange failed: {resp.status} - {error_text}")
                        return RedirectResponse(
                            url=f"{settings.FRONTEND_URL}/login?error={quote('Token exchange failed')}"
                        )
                    token_json = await resp.json()
                    access_token = token_json.get("access_token")
                    refresh_token = token_json.get("refresh_token")
                    logger.info("Token exchange successful")

        if not access_token:
            logger.error("No access token received in callback")
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/login?error={quote('No access token received')}"
            )

        # Minimal validation for GET flow
        if not account_id and "_" in access_token:
            account_id = access_token.split("_")[-1]
        
        if not account_id:
            account_id = f"user_{secrets.token_hex(8)}"
        
        # Redirect to frontend with minimal data
        # Frontend will extract token from URL and POST to secure endpoint
        frontend_redirect = (
            f"{settings.FRONTEND_URL}/oauth/callback"
            f"?token={quote(access_token)}"
            f"&account_id={quote(account_id)}"
            f"&state={quote(state or '')}"
        )
        
        logger.info(f"Redirecting to frontend for secure token handling")
        return RedirectResponse(url=frontend_redirect)

    except Exception as e:
        logger.error(f"OAuth GET callback failed: {e}", exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={quote(str(e)[:100])}"
        )

# -------------------------------------------------------------------
# REFRESH TOKEN ENDPOINT
# -------------------------------------------------------------------
@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    refresh_token: str = Body(..., embed=True),
    db=Depends(get_db),
):
    """
    Refresh expired access tokens using refresh token.
    """
    try:
        # Find active session with this refresh token
        session = db.query(UserSession).filter(
            UserSession.refresh_token == refresh_token,
            UserSession.is_active.is_(True),
            UserSession.refresh_expires_at > datetime.utcnow(),
        ).first()
        
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
        
        # Verify user still exists
        user = db.query(User).filter(User.id == session.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User not found or inactive")
        
        # Try to refresh Deriv token (if we have credentials)
        new_access_token = None
        try:
            # Note: Deriv may not support refresh tokens in all flows
            # This is a placeholder for when you have proper OAuth client credentials
            async with aiohttp.ClientSession() as http_session:
                refresh_data = {
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": settings.DERIV_APP_ID,
                }
                async with http_session.post(DERIV_OAUTH_TOKEN_URL, data=refresh_data) as resp:
                    if resp.status == 200:
                        token_json = await resp.json()
                        new_access_token = token_json.get("access_token")
                        new_refresh_token = token_json.get("refresh_token")
        except Exception as e:
            logger.warning(f"Could not refresh Deriv token: {e}")
            # Continue with old token if refresh fails
        
        # Update session with new tokens if available
        if new_access_token:
            session.access_token = new_access_token
        if new_refresh_token:
            session.refresh_token = new_refresh_token
        
        session.expires_at = datetime.utcnow() + timedelta(hours=24)
        db.commit()
        
        # Create new JWT
        app_token = create_access_token({
            "sub": user.id,
            "session_id": session.id,
            "email": user.email,
            "deriv_account_id": user.deriv_account_id,
            "exp": int(session.expires_at.timestamp()),
        })
        
        # Update cookies
        set_auth_cookies(response, app_token, str(session.id))
        
        return {
            "success": True,
            "access_token": new_access_token or session.access_token,
            "refresh_token": new_refresh_token or session.refresh_token,
            "expires_at": session.expires_at.isoformat(),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(status_code=500, detail="Token refresh failed")

# -------------------------------------------------------------------
# CALLBACK HEAD ROUTE
# -------------------------------------------------------------------
@router.head("/callback")
async def head_callback():
    """
    Handle HEAD requests from Deriv (they check the endpoint).
    Returns 200 OK to confirm the endpoint exists.
    """
    logger.debug("HEAD request received for /auth/callback")
    return Response(status_code=200)

# -------------------------------------------------------------------
# LOGOUT
# -------------------------------------------------------------------
@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    authorization: str = Header(None),
    session_token: str = Cookie(None),
    db=Depends(get_db),
):
    """
    Logout user and clear all sessions.
    Accepts token from header or cookie.
    """
    token = None
    
    # Try to get token from header first, then cookie
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
    elif session_token:
        token = session_token
    
    if not token:
        # Still clear cookies even if no token
        clear_auth_cookies(response)
        return {"message": "Logged out"}
    
    try:
        payload = decode_access_token(token)
        session_id = payload.get("session_id")
        
        if session_id:
            # Mark session as inactive
            session = db.query(UserSession).filter(
                UserSession.id == session_id,
            ).first()
            
            if session:
                session.is_active = False
                db.commit()
                logger.info(f"Session {session_id} logged out")
            
            # Clear CSRF token from storage
            if USE_REDIS:
                redis_client.delete(f"csrf:{session_id}")
        
        # Clear all cookies
        clear_auth_cookies(response)
        
        return {"message": "Logged out"}

    except Exception as e:
        logger.error(f"Logout error: {e}", exc_info=True)
        # Still clear cookies on error
        clear_auth_cookies(response)
        raise HTTPException(status_code=500, detail="Logout failed")

# -------------------------------------------------------------------
# CURRENT USER (ENHANCED)
# -------------------------------------------------------------------
@router.get("/me")
async def get_current_user(
    request: Request,
    authorization: str = Header(None),
    session_token: str = Cookie(None),
    db=Depends(get_db),
):
    """
    Get current user info with CSRF protection for state-changing operations.
    """
    token = None
    
    # Try to get token from header first, then cookie
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
    elif session_token:
        token = session_token
    
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        session_id = payload.get("session_id")
        
        if not user_id or not session_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Verify session
        session = db.query(UserSession).filter(
            UserSession.id == session_id,
            UserSession.user_id == user_id,
            UserSession.is_active.is_(True),
            UserSession.expires_at > datetime.utcnow(),
        ).first()
        
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user settings
        user_settings_dict = UserSettingsRepo.get_dict(user_id)
        
        # Check for CSRF token if this was a state-changing request
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            csrf_token = request.headers.get("X-CSRF-Token") or request.cookies.get("csrf_token")
            if not csrf_token:
                raise HTTPException(status_code=403, detail="CSRF token required")
            
            # Validate CSRF token
            if USE_REDIS:
                stored_csrf = redis_client.get(f"csrf:{session_id}")
                if not stored_csrf or stored_csrf != csrf_token:
                    raise HTTPException(status_code=403, detail="Invalid CSRF token")
        
        return {
            "id": user.id,
            "email": user.email,
            "deriv_account_id": user.deriv_account_id,
            "is_active": user.is_active,
            "settings": user_settings_dict,
            "has_settings": user_settings_dict is not None,
            "session": {
                "id": session_id,
                "expires_at": session.expires_at.isoformat(),
                "refresh_available": session.refresh_expires_at > datetime.utcnow() if session.refresh_expires_at else False,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/me error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get user")

# -------------------------------------------------------------------
# VALIDATE SESSION
# -------------------------------------------------------------------
@router.post("/validate")
async def validate_session(
    request: Request,
    response: Response,
):
    """
    Validate current session and refresh if needed.
    Frontend can call this periodically to keep session alive.
    """
    try:
        token = request.cookies.get("session_token")
        if not token:
            raise HTTPException(status_code=401, detail="No session")
        
        payload = decode_access_token(token)
        session_id = payload.get("session_id")
        
        if not session_id:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        # Check if token is about to expire (within 1 hour)
        exp_timestamp = payload.get("exp")
        if exp_timestamp:
            expires_at = datetime.fromtimestamp(exp_timestamp)
            time_left = (expires_at - datetime.utcnow()).total_seconds()
            
            # Refresh if less than 1 hour left
            if time_left < 3600:
                logger.info(f"Refreshing token for session {session_id}")
                
                db = SessionLocal()
                try:
                    session = db.query(UserSession).filter(
                        UserSession.id == session_id,
                        UserSession.is_active.is_(True),
                    ).first()
                    
                    if session and session.user:
                        # Create new JWT
                        new_expires = datetime.utcnow() + timedelta(hours=24)
                        new_token = create_access_token({
                            "sub": session.user.id,
                            "session_id": session.id,
                            "email": session.user.email,
                            "deriv_account_id": session.user.deriv_account_id,
                            "exp": int(new_expires.timestamp()),
                        })
                        
                        # Update session expiry
                        session.expires_at = new_expires
                        db.commit()
                        
                        # Update cookie
                        response.set_cookie(
                            key="session_token",
                            value=new_token,
                            httponly=True,
                            secure=not settings.DEBUG,
                            samesite="lax",
                            max_age=24 * 3600,
                            path="/",
                        )
                        
                        return {
                            "refreshed": True,
                            "expires_at": new_expires.isoformat(),
                        }
                finally:
                    db.close()
        
        return {"valid": True, "refreshed": False}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session validation error: {e}")
        raise HTTPException(status_code=500, detail="Session validation failed")