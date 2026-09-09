from datetime import datetime

from bson import ObjectId
from flask import Blueprint, jsonify, request

from config.db import get_db
from utils.json import to_jsonable
from utils.validators import require_fields


admin_live_sessions_bp = Blueprint("admin_live_sessions", __name__)


def _serialize_session(session):
    session_id = session["_id"]
    return {
        "id": str(session_id),
        "dayNumber": int(session.get("dayNumber", 1)),
        "title": session.get("title", ""),
        "sessionUrl": session.get("sessionUrl", ""),
        "status": session.get("status", "active"),
        "assignmentCount": session.get("assignmentCount", 0),
        "createdAt": session.get("createdAt"),
        "updatedAt": session.get("updatedAt"),
    }


@admin_live_sessions_bp.route("", methods=["GET"])
@admin_live_sessions_bp.route("/", methods=["GET"])
def list_live_sessions():
    db = get_db()
    sessions = list(db.live_sessions.find({}).sort([("dayNumber", 1), ("createdAt", 1)]))
    out = []
    for session in sessions:
        assignment_count = db.live_session_assignments.count_documents({
            "sessionId": session["_id"],
            "status": "assigned",
        })
        out.append(_serialize_session({**session, "assignmentCount": assignment_count}))
    return jsonify({"sessions": to_jsonable(out)})


@admin_live_sessions_bp.route("/history", methods=["GET"])
@admin_live_sessions_bp.route("/history/", methods=["GET"])
def list_live_session_history():
    db = get_db()
    events = list(db.live_session_joins.find({}).sort("joinedAt", -1).limit(300))
    user_ids = sorted({str(event.get("userId") or "").strip() for event in events if event.get("userId")})
    users = list(db.users.find({"userId": {"$in": user_ids}}, {"userId": 1, "name": 1, "email": 1, "collegeName": 1, "courseStream": 1})) if user_ids else []
    users_by_id = {str(user.get("userId") or "").strip(): user for user in users}

    out = []
    for event in events:
        user_id = str(event.get("userId") or "").strip()
        user = users_by_id.get(user_id, {})
        out.append({
            "id": str(event["_id"]),
            "sessionId": str(event.get("sessionId", "")),
            "dayNumber": int(event.get("dayNumber", 1)),
            "title": event.get("title", ""),
            "sessionUrl": event.get("sessionUrl", ""),
            "userId": user_id,
            "studentName": user.get("name") or user_id,
            "studentEmail": user.get("email", ""),
            "collegeName": user.get("collegeName", ""),
            "courseStream": user.get("courseStream", ""),
            "joinedAt": event.get("joinedAt"),
        })

    return jsonify({"history": to_jsonable(out)})


@admin_live_sessions_bp.route("/assignment-history", methods=["GET"])
@admin_live_sessions_bp.route("/assignment-history/", methods=["GET"])
def list_assignment_history():
    db = get_db()
    events = list(db.live_session_assignment_history.find({}).sort("assignedAt", -1).limit(500))
    user_ids = sorted({str(event.get("userId") or "").strip() for event in events if event.get("userId")})
    users = list(db.users.find({"userId": {"$in": user_ids}}, {"userId": 1, "name": 1, "email": 1, "collegeName": 1, "courseStream": 1})) if user_ids else []
    users_by_id = {str(user.get("userId") or "").strip(): user for user in users}

    out = []
    for event in events:
        user_id = str(event.get("userId") or "").strip()
        user = users_by_id.get(user_id, {})
        out.append({
            "id": str(event["_id"]),
            "sessionId": str(event.get("sessionId", "")),
            "dayNumber": int(event.get("dayNumber", 1)),
            "title": event.get("title", ""),
            "userId": user_id,
            "studentName": user.get("name") or user_id,
            "studentEmail": user.get("email", ""),
            "collegeName": user.get("collegeName", ""),
            "courseStream": user.get("courseStream", ""),
            "assignedBy": event.get("assignedBy", ""),
            "assignedAt": event.get("assignedAt"),
            "action": event.get("action", "assigned"),
        })

    return jsonify({"history": to_jsonable(out)})


@admin_live_sessions_bp.route("", methods=["POST"])
@admin_live_sessions_bp.route("/", methods=["POST"])
def create_live_session():
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["dayNumber", "sessionUrl"])
    if not ok:
        return jsonify({"error": msg}), 400

    try:
        day_number = int(payload.get("dayNumber"))
    except Exception:
        return jsonify({"error": "dayNumber must be a number"}), 400

    session_url = str(payload.get("sessionUrl") or "").strip()
    if day_number < 1:
        return jsonify({"error": "dayNumber must be at least 1"}), 400
    if not session_url:
        return jsonify({"error": "sessionUrl is required"}), 400

    db = get_db()
    now = datetime.utcnow()
    title = str(payload.get("title") or f"Day {day_number}").strip()
    doc = {
        "dayNumber": day_number,
        "title": title,
        "sessionUrl": session_url,
        "status": "active",
        "createdAt": now,
        "updatedAt": now,
    }
    res = db.live_sessions.insert_one(doc)
    return jsonify({"session": to_jsonable(_serialize_session({**doc, "_id": res.inserted_id}))}), 201


@admin_live_sessions_bp.route("/<session_id>", methods=["PUT", "PATCH"])
@admin_live_sessions_bp.route("/<session_id>/", methods=["PUT", "PATCH"])
def update_live_session(session_id: str):
    payload = request.get_json(silent=True) or {}
    try:
        oid = ObjectId(session_id)
    except Exception:
        return jsonify({"error": "Invalid session id"}), 400

    db = get_db()
    session = db.live_sessions.find_one({"_id": oid})
    if not session:
        return jsonify({"error": "Live session not found"}), 404

    try:
        day_number = int(payload.get("dayNumber", session.get("dayNumber", 1)))
    except Exception:
        return jsonify({"error": "dayNumber must be a number"}), 400

    session_url = str(payload.get("sessionUrl", session.get("sessionUrl", "")) or "").strip()
    if day_number < 1:
        return jsonify({"error": "dayNumber must be at least 1"}), 400
    if not session_url:
        return jsonify({"error": "sessionUrl is required"}), 400

    update = {
        "dayNumber": day_number,
        "title": str(payload.get("title") or f"Day {day_number}").strip(),
        "sessionUrl": session_url,
        "updatedAt": datetime.utcnow(),
    }
    db.live_sessions.update_one({"_id": oid}, {"$set": update})
    updated = db.live_sessions.find_one({"_id": oid})
    assignment_count = db.live_session_assignments.count_documents({"sessionId": oid, "status": "assigned"})
    return jsonify({"session": to_jsonable(_serialize_session({**updated, "assignmentCount": assignment_count}))})


@admin_live_sessions_bp.route("/<session_id>", methods=["DELETE"])
@admin_live_sessions_bp.route("/<session_id>/", methods=["DELETE"])
def delete_live_session(session_id: str):
    try:
        oid = ObjectId(session_id)
    except Exception:
        return jsonify({"error": "Invalid session id"}), 400

    db = get_db()
    if not db.live_sessions.find_one({"_id": oid}):
        return jsonify({"error": "Live session not found"}), 404

    db.live_sessions.delete_one({"_id": oid})
    db.live_session_assignments.delete_many({"sessionId": oid})
    return jsonify({"message": "Live session deleted"})


@admin_live_sessions_bp.route("/<session_id>/assignments", methods=["GET"])
@admin_live_sessions_bp.route("/<session_id>/assignments/", methods=["GET"])
def list_live_session_assignments(session_id: str):
    try:
        oid = ObjectId(session_id)
    except Exception:
        return jsonify({"error": "Invalid session id"}), 400

    db = get_db()
    docs = list(db.live_session_assignments.find({"sessionId": oid, "status": "assigned"}))
    user_ids = sorted({str(doc.get("userId") or "").strip() for doc in docs if doc.get("userId")})
    return jsonify({"userIds": user_ids})


@admin_live_sessions_bp.route("/<session_id>/assignments", methods=["PUT"])
@admin_live_sessions_bp.route("/<session_id>/assignments/", methods=["PUT"])
def sync_live_session_assignments(session_id: str):
    payload = request.get_json(silent=True) or {}
    user_ids = payload.get("userIds")
    if not isinstance(user_ids, list):
        return jsonify({"error": "userIds must be a list"}), 400

    try:
        oid = ObjectId(session_id)
    except Exception:
        return jsonify({"error": "Invalid session id"}), 400

    assigned_by = str(payload.get("assignedBy") or "").strip() or "admin"

    db = get_db()
    session = db.live_sessions.find_one({"_id": oid})
    if not session:
        return jsonify({"error": "Live session not found"}), 404

    normalized = sorted({str(user_id).strip() for user_id in user_ids if str(user_id).strip()})
    valid_users = list(db.users.find({"userId": {"$in": normalized}, "role": "answerer"}, {"userId": 1}))
    valid_user_ids = sorted({str(user.get("userId") or "").strip() for user in valid_users if user.get("userId")})
    existing_docs = list(db.live_session_assignments.find({"sessionId": oid}, {"userId": 1}))
    existing_user_ids = {str(doc.get("userId") or "").strip() for doc in existing_docs if doc.get("userId")}

    now = datetime.utcnow()
    to_add = [user_id for user_id in valid_user_ids if user_id not in existing_user_ids]
    for user_id in valid_user_ids:
        db.live_session_assignments.update_one(
            {"sessionId": oid, "userId": user_id},
            {"$setOnInsert": {"createdAt": now}, "$set": {"status": "assigned", "updatedAt": now}},
            upsert=True,
        )

    to_remove = [user_id for user_id in existing_user_ids if user_id not in set(valid_user_ids)]
    if to_remove:
        db.live_session_assignments.delete_many({"sessionId": oid, "userId": {"$in": to_remove}})

    history_docs = []
    for user_id in to_add:
        history_docs.append({
            "sessionId": oid,
            "dayNumber": int(session.get("dayNumber", 1)),
            "title": session.get("title") or f"Day {int(session.get('dayNumber', 1))}",
            "userId": user_id,
            "assignedBy": assigned_by,
            "assignedAt": now,
            "action": "assigned",
        })
    for user_id in to_remove:
        history_docs.append({
            "sessionId": oid,
            "dayNumber": int(session.get("dayNumber", 1)),
            "title": session.get("title") or f"Day {int(session.get('dayNumber', 1))}",
            "userId": user_id,
            "assignedBy": assigned_by,
            "assignedAt": now,
            "action": "removed",
        })
    if history_docs:
        db.live_session_assignment_history.insert_many(history_docs)

    return jsonify({
        "message": "Live session assignments updated",
        "assignedCount": len(valid_user_ids),
        "userIds": valid_user_ids,
    })
