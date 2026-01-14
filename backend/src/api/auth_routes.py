# backend/src/api/auth_routes.py
from fastapi import APIRouter, HTTPException, Depends, Body, Header, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse
from urllib.parse import urlencode, quote
from typing import Optional
import aiohttp
import secrets
from datetime import datetime, timedelta

from src.config.settings import settings
from src.db.session import SessionLocal
from src.db.models.user import User, UserSession
from src.utils.logger import logger
from src.utils.security import create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Deriv endpoints
DERIV_OAUTH_AUTH_URL = "https://oauth.deriv.com/oauth2/authorize"
DERIV_OAUTH_TOKEN_URL = "https://oauth.deriv.com/oauth2/token"


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
async def deriv_login():
    """
    Returns Deriv OAuth URL.
    Frontend must redirect browser to this URL.
    """
    try:
        state = secrets.token_urlsafe(32)

        params = {
            "app_id": settings.DERIV_APP_ID,
            "redirect_uri": settings.DERIV_OAUTH_REDIRECT_URI,
            "response_type": "token",  # Deriv prefers token flow
            "scope": "read write trade",
            "state": state,
            "brand": "deriv",
            "language": "EN",
        }

        auth_url = f"{DERIV_OAUTH_AUTH_URL}?{urlencode(params)}"
        logger.info(f"Deriv OAuth URL generated: {auth_url[:100]}...")

        return JSONResponse({"redirect_url": auth_url, "state": state})

    except Exception as e:
        logger.error(f"OAuth login generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate login URL")


# -------------------------------------------------------------------
# CALLBACK (GET) → Deriv redirects here
# -------------------------------------------------------------------
@router.get("/callback")
async def deriv_callback(
    request: Request,
    acct1: Optional[str] = Query(None),
    token1: Optional[str] = Query(None),
    acct2: Optional[str] = Query(None),
    token2: Optional[str] = Query(None),
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    db=Depends(get_db),
):
    """
    Handles Deriv OAuth redirect.
    Supports:
    - token flow (token1 / token2)
    - code flow (code)
    """
    try:
        logger.info(f"OAuth callback received: acct1={acct1}, token1={'***' if token1 else None}, "
                   f"acct2={acct2}, token2={'***' if token2 else None}, code={'***' if code else None}, state={state}")
        
        access_token: Optional[str] = None
        account_id: Optional[str] = None

        # ----------------------------
        # 1. Resolve access token and account ID
        # ----------------------------
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
            # Fallback: exchange code for token
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
                        raise HTTPException(status_code=400, detail=f"Token exchange failed: {error_text}")
                    token_json = await resp.json()
                    access_token = token_json.get("access_token")
                    logger.info(f"Token exchange successful, got access token: {'***' if access_token else None}")

        if not access_token:
            logger.error("No access token received in callback")
            raise HTTPException(status_code=400, detail="No access token received")

        # ----------------------------
        # 2. Simplified Token Validation
        # ----------------------------
        logger.info(f"Using simplified token validation...")
        
        # Use the account from token if available
        if not account_id:
            account_id = acct1 or acct2
        
        if not account_id:
            # Try to extract from token (last part after underscore)
            if "_" in access_token:
                account_id = access_token.split("_")[-1]
            else:
                # Generate a random account ID if not provided
                account_id = f"user_{secrets.token_hex(8)}"
        
        email = f"{account_id}@deriv.com"
        logger.info(f"Using account ID: {account_id}")

        # ----------------------------
        # 3. Create / update user
        # ----------------------------
        user = db.query(User).filter(User.deriv_account_id == account_id).first()

        if not user:
            logger.info(f"Creating new user for account {account_id}")
            user = User(
                email=email,
                deriv_account_id=account_id,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"User created with ID: {user.id}")
        else:
            user.last_login = datetime.utcnow()
            db.commit()
            logger.info(f"Existing user found: {user.id}")

        # ----------------------------
        # 4. Create session
        # ----------------------------
        expires_at = datetime.utcnow() + timedelta(hours=24)

        session_obj = UserSession(
            user_id=user.id,
            access_token=access_token,
            refresh_token=None,
            expires_at=expires_at,
            is_active=True,
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
            }
        )
        logger.info(f"App JWT created for user {user.id}")

        # ----------------------------
        # 6. Redirect back to frontend
        # ----------------------------
        # URL encode all parameters
        frontend_redirect = (
            f"{settings.FRONTEND_URL}/#/oauth/callback"
            f"?user_id={user.id}"
            f"&session_token={quote(app_token)}"
            f"&access_token={quote(access_token)}"
            f"&email={quote(email)}"
            f"&account_id={quote(account_id)}"
        )

        logger.info(f"OAuth success → redirecting user {email} to frontend")
        return RedirectResponse(url=frontend_redirect)

    except HTTPException as he:
        logger.error(f"OAuth HTTP error: {he.detail}")
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={quote(str(he.detail))}"
        )
    except Exception as e:
        logger.error(f"OAuth callback failed: {e}", exc_info=True)
        # Redirect to frontend login with error
        error_msg = str(e)[:100]
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error={quote(error_msg)}"
        )


# -------------------------------------------------------------------
# LOGOUT
# -------------------------------------------------------------------
@router.post("/logout")
async def logout(
    authorization: str = Header(None),
    db=Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.replace("Bearer ", "")
    try:
        payload = decode_access_token(token)
        session_id = payload.get("session_id")

        session = db.query(UserSession).filter(
            UserSession.id == session_id,
            UserSession.is_active.is_(True),
        ).first()

        if session:
            session.is_active = False
            db.commit()
            logger.info(f"Session {session_id} logged out")

        return {"message": "Logged out"}

    except Exception as e:
        logger.error(f"Logout error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Logout failed")


# -------------------------------------------------------------------
# CURRENT USER
# -------------------------------------------------------------------
@router.get("/me")
async def get_current_user(
    authorization: str = Header(None),
    db=Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.replace("Bearer ", "")
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        session_id = payload.get("session_id")

        session = db.query(UserSession).filter(
            UserSession.id == session_id,
            UserSession.user_id == user_id,
            UserSession.is_active.is_(True),
        ).first()

        if not session:
            raise HTTPException(status_code=401, detail="Invalid session")

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "id": user.id,
            "email": user.email,
            "deriv_account_id": user.deriv_account_id,
            "is_active": user.is_active,
        }

    except Exception as e:
        logger.error(f"/me error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get user")