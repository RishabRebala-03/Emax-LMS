"""
Admin routes for Interview Preparation access management.

Collection used: interview_prep_assignments
Document shape:  { userId: str, status: "assigned"|"removed", updatedAt: datetime }
"""

from datetime import datetime

from bson import ObjectId
from flask import Blueprint, jsonify, request

from config.db import get_db
from utils.json import to_jsonable

admin_interview_prep_bp = Blueprint("admin_interview_prep", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# GET /admin/interview-prep/assignments
# Returns all userIds that currently have interview prep access.
# ─────────────────────────────────────────────────────────────────────────────
@admin_interview_prep_bp.route("/assignments", methods=["GET"])
@admin_interview_prep_bp.route("/assignments/", methods=["GET"])
def list_assignments():
    db = get_db()
    docs = list(db.interview_prep_assignments.find({"status": "assigned"}))
    user_ids = sorted(
        {str(d.get("userId") or "").strip() for d in docs if d.get("userId")}
    )
    return jsonify({"userIds": user_ids})


# ─────────────────────────────────────────────────────────────────────────────
# PUT /admin/interview-prep/assignments
# Body: { "userIds": ["u1", "u2", ...] }
# Replaces the full assignment set (upsert assigned, delete removed).
# ─────────────────────────────────────────────────────────────────────────────
@admin_interview_prep_bp.route("/assignments", methods=["PUT"])
@admin_interview_prep_bp.route("/assignments/", methods=["PUT"])
def sync_assignments():
    payload = request.get_json(silent=True) or {}
    raw_ids = payload.get("userIds")
    if not isinstance(raw_ids, list):
        return jsonify({"error": "userIds must be an array"}), 400

    new_ids = {str(uid).strip() for uid in raw_ids if str(uid).strip()}

    db = get_db()
    existing_docs = list(db.interview_prep_assignments.find({}, {"userId": 1}))
    existing_ids = {str(d.get("userId") or "").strip() for d in existing_docs if d.get("userId")}

    to_add = new_ids - existing_ids
    to_remove = existing_ids - new_ids
    now = datetime.utcnow()

    # Upsert newly assigned
    for uid in to_add:
        db.interview_prep_assignments.update_one(
            {"userId": uid},
            {"$set": {"userId": uid, "status": "assigned", "updatedAt": now}},
            upsert=True,
        )

    # Remove de-assigned
    if to_remove:
        db.interview_prep_assignments.delete_many({"userId": {"$in": list(to_remove)}})

    # Return the current full set
    final_docs = list(db.interview_prep_assignments.find({"status": "assigned"}))
    final_ids = sorted(
        {str(d.get("userId") or "").strip() for d in final_docs if d.get("userId")}
    )

    added_count = len(to_add)
    removed_count = len(to_remove)
    return jsonify({
        "userIds": final_ids,
        "message": f"Interview prep access updated: {added_count} added, {removed_count} removed.",
    })


# ─────────────────────────────────────────────────────────────────────────────
# GET /admin/interview-prep/assignments/stats
# Quick summary stats for the admin dashboard card.
# ─────────────────────────────────────────────────────────────────────────────
@admin_interview_prep_bp.route("/assignments/stats", methods=["GET"])
def assignment_stats():
    db = get_db()
    count = db.interview_prep_assignments.count_documents({"status": "assigned"})
    return jsonify({"assignedCount": count})
