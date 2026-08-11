from flask import Blueprint, jsonify, request
from datetime import datetime
import secrets
from config.db import get_db
from utils.json import to_jsonable
from utils.validators import require_fields

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/login")
def login():
    """Login using userId (or naxUnid) + password + role."""
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userId", "password", "role"])
    if not ok:
        return jsonify({"error": msg}), 400

    userId   = str(payload["userId"]).strip()
    password = str(payload["password"]).strip()
    role     = str(payload["role"]).strip()

    db = get_db()

    # Accept login via userId OR naxUnid — both fields hold the same NAX_XXXX value
    # for self-registered students, but querying both keeps it robust.
    user = db.users.find_one({
        "$or": [{"userId": userId}, {"naxUnid": userId}],
        "role": role,
    })

    if not user:
        return jsonify({"error": "Invalid userId/role"}), 401
    if user.get("password") != password:
        return jsonify({"error": "Invalid password"}), 401
    if role == "answerer" and not user.get("isActive", True):
        return jsonify({"error": "Your account is inactive. Please contact your administrator."}), 403

    session_token = secrets.token_urlsafe(32)
    db.users.update_one({"_id": user["_id"]}, {"$set": {
        "lastLoginAt": datetime.utcnow(),
        "activeSessionToken": session_token,
    }})

    res_user = {
        "id":     str(user["_id"]),
        "userId": user.get("userId"),
        "name":   user.get("name"),
        "email":  user.get("email"),
        "role":   user.get("role"),
    }
    return jsonify({"user": to_jsonable(res_user), "sessionToken": session_token})


@auth_bp.get("/session")
def session_status():
    """Return whether this browser still owns the user's latest login session."""
    user_id = request.args.get("userId", "").strip()
    role = request.args.get("role", "").strip()
    token = request.headers.get("X-Session-Token", "")
    if not user_id or not role or not token:
        return jsonify({"valid": False}), 401

    user = get_db().users.find_one({
        "$or": [{"userId": user_id}, {"naxUnid": user_id}],
        "role": role,
        "activeSessionToken": token,
    }, {"_id": 1})
    return jsonify({"valid": bool(user)}), (200 if user else 401)


@auth_bp.post("/change-password")
def change_password():
    """
    Payload:
    {
      "userId": "...",
      "oldPassword": "...",
      "newPassword": "...",
      "role": "admin" | "answerer"
    }
    """
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userId", "oldPassword", "newPassword", "role"])
    if not ok:
        return jsonify({"error": msg}), 400

    userId       = str(payload["userId"]).strip()
    old_password = str(payload["oldPassword"]).strip()
    new_password = str(payload["newPassword"]).strip()
    role         = str(payload["role"]).strip()

    if old_password == new_password:
        return jsonify({"error": "New password cannot be same as old password"}), 400

    db = get_db()

    # Same dual-field lookup as login
    user = db.users.find_one({
        "$or": [{"userId": userId}, {"naxUnid": userId}],
        "role": role,
    })
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.get("password") != old_password:
        return jsonify({"error": "Old password is incorrect"}), 401

    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password": new_password,
            "passwordUpdatedAt": datetime.utcnow(),
        }}
    )
    return jsonify({"message": "Password updated successfully"})
