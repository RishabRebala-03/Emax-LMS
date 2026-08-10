#admin_users.py
from flask import Blueprint, jsonify, request
from datetime import datetime
from bson import ObjectId
from typing import Optional
from config.db import get_db
from utils.json import to_jsonable
from utils.validators import require_fields

admin_users_bp = Blueprint("admin_users", __name__)


def _merge_registration_fields(user: dict, registration: Optional[dict]) -> dict:
    if not registration:
        return user

    merged = dict(user)
    field_map = {
        "naxUnid": "naxUnid",
        "studentName": "name",
        "studentId": "studentId",
        "email": "email",
        "collegeEmail": "collegeEmail",
        "mobile": "mobile",
        "gender": "gender",
        "courseStream": "courseStream",
        "cgpa": "cgpa",
        "sapCertification": "sapCertification",
        "collegeName": "collegeName",
        "dob": "dob",
        "documentUrl": "documentUrl",
        "documentName": "documentName",
    }

    for reg_key, user_key in field_map.items():
        if merged.get(user_key) in (None, ""):
            merged[user_key] = registration.get(reg_key)

    if merged.get("collegeRollNumber") in (None, "") and registration.get("studentId"):
        merged["collegeRollNumber"] = registration.get("studentId")

    return merged

# =========================
# LIST USERS
# =========================
@admin_users_bp.route("", methods=["GET"])
@admin_users_bp.route("/", methods=["GET"])
def list_users():
    db = get_db()
    users = list(db.users.find({"role": "answerer"}, {"password": 0}))
    out = []
    for u in users:
        reg = None
        lookup_keys = [u.get("naxUnid"), u.get("userId"), u.get("studentId"), u.get("email")]
        for key in filter(None, lookup_keys):
            reg = db.student_registrations.find_one({
                "$or": [
                    {"naxUnid": key},
                    {"studentId": key},
                    {"email": str(key).strip().lower()},
                ]
            })
            if reg:
                break

        merged = _merge_registration_fields(u, reg)
        out.append({
            "id": str(merged["_id"]),
            "name": merged.get("name"),
            "email": merged.get("email"),
            "userId": merged.get("userId"),
            "role": merged.get("role"),
            "createdAt": merged.get("createdAt"),
            "isActive": merged.get("isActive", True),
            "naxUnid": merged.get("naxUnid"),
            "mobile": merged.get("mobile"),
            "gender": merged.get("gender"),
            "collegeName": merged.get("collegeName"),
            "collegeEmail": merged.get("collegeEmail"),
            "collegeRollNumber": merged.get("collegeRollNumber"),
            "courseStream": merged.get("courseStream"),
            "cgpa": merged.get("cgpa"),
            "sapCertification": merged.get("sapCertification"),
            "studentId": merged.get("studentId"),
            "dob": merged.get("dob"),
            "documentUrl": merged.get("documentUrl"),
            "documentName": merged.get("documentName"),
        })
    return jsonify({"users": to_jsonable(out)})

# =========================
# CREATE USER
# =========================
@admin_users_bp.route("", methods=["POST"])
@admin_users_bp.route("/", methods=["POST"])
def create_user():
    payload = request.get_json(silent=True) or {}
    print("CREATE USER PAYLOAD:", payload)
    ok, msg = require_fields(payload, ["name", "email", "userId", "password"])
    if not ok:
        return jsonify({"error": msg}), 400
    
    db = get_db()
    userId = str(payload["userId"]).strip()
    if db.users.find_one({"userId": userId}):
        return jsonify({"error": "userId already exists"}), 409
    
    doc = {
        "name": payload["name"].strip(),
        "email": payload["email"].strip().lower(),
        "userId": userId,
        "password": str(payload["password"]).strip(),  # plain text (as requested)
        "role": "answerer",
        "createdAt": datetime.utcnow(),
        "lastLoginAt": None,
        "isActive": True,
    }
    res = db.users.insert_one(doc)
    return jsonify({
        "user": to_jsonable({
            "id": str(res.inserted_id),
            "name": doc["name"],
            "email": doc["email"],
            "userId": doc["userId"],
            "role": doc["role"],
            "createdAt": doc["createdAt"],
            "isActive": doc["isActive"], 
        })
    }), 201

# =========================
# ADMIN CHANGE USER PASSWORD (NEW)
# =========================
@admin_users_bp.route("/<user_id>/change-password", methods=["PUT", "PATCH"])
@admin_users_bp.route("/<user_id>/change-password/", methods=["PUT", "PATCH"])
def admin_change_user_password(user_id: str):
    """
    Admin endpoint to change any user's password.
    Payload:
    {
      "newPassword": "..."
    }
    """
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["newPassword"])
    if not ok:
        return jsonify({"error": msg}), 400
    
    new_password = str(payload["newPassword"]).strip()
    
    if not new_password or len(new_password) < 4:
        return jsonify({"error": "Password must be at least 4 characters"}), 400
    
    db = get_db()
    
    # Try to find user by ObjectId first, then by userId
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = db.users.find_one({"userId": user_id})
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Update password
    db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password": new_password,
                "passwordUpdatedAt": datetime.utcnow()
            }
        }
    )
    
    return jsonify({
        "message": "Password updated successfully",
        "userId": user.get("userId")
    })


# =========================
# TOGGLE USER ACTIVE STATUS
# =========================
@admin_users_bp.route("/<user_id>/status", methods=["PUT", "PATCH"])
@admin_users_bp.route("/<user_id>/status/", methods=["PUT", "PATCH"])
def update_user_status(user_id: str):
    """
    Payload:
    {
        "isActive": true/false
    }
    """
    payload = request.get_json(silent=True) or {}

    if "isActive" not in payload:
        return jsonify({"error": "isActive field required"}), 400

    db = get_db()

    # Find by ObjectId first, then fallback to userId
    try:
        q = {"_id": ObjectId(user_id)}
    except Exception:
        q = {"userId": user_id}

    user = db.users.find_one(q)
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "isActive": bool(payload["isActive"]),
                "statusUpdatedAt": datetime.utcnow()
            }
        }
    )

    return jsonify({
        "message": "User status updated",
        "userId": user.get("userId"),
        "isActive": bool(payload["isActive"])
    })

# =========================
# DELETE USER
# =========================
@admin_users_bp.route("/<user_id>", methods=["DELETE"])
@admin_users_bp.route("/<user_id>/", methods=["DELETE"])
def delete_user(user_id: str):
    db = get_db()
    try:
        q = {"_id": ObjectId(user_id)}
    except Exception:
        q = {"userId": user_id}
    
    user = db.users.find_one(q)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    db.users.delete_one({"_id": user["_id"]})
    db.exam_assignments.delete_many({"userId": user.get("userId")})
    db.attempts.delete_many({"userId": user.get("userId")})
    
    return jsonify({"message": "Deleted"})


@admin_users_bp.route("/<user_id>", methods=["PUT", "PATCH"])
@admin_users_bp.route("/<user_id>/", methods=["PUT", "PATCH"])
def update_user(user_id: str):
    payload = request.get_json(silent=True) or {}
    db = get_db()
    try:
        q = {"_id": ObjectId(user_id)}
    except Exception:
        q = {"userId": user_id}

    user = db.users.find_one(q)
    if not user:
        return jsonify({"error": "User not found"}), 404

    allowed = [
        "name", "email", "mobile", "gender", "collegeName", "collegeEmail",
        "collegeRollNumber", "courseStream", "cgpa", "sapCertification",
        "naxUnid", "studentId", "dob", "documentUrl", "documentName"
    ]
    updates = {k: payload[k] for k in allowed if k in payload}
    updates["updatedAt"] = datetime.utcnow()

    db.users.update_one({"_id": user["_id"]}, {"$set": updates})

    updated = db.users.find_one({"_id": user["_id"]}, {"password": 0})
    return jsonify({"user": to_jsonable({
        "id": str(updated["_id"]),
        **{k: updated.get(k) for k in [
            "name","email","userId","role","createdAt","isActive",
            "naxUnid","mobile","gender","collegeName","collegeEmail",
            "collegeRollNumber","courseStream","cgpa","sapCertification","studentId",
            "dob", "documentUrl", "documentName"
        ]}
    })})
