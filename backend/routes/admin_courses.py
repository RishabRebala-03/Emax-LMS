from datetime import datetime

from bson import ObjectId
from flask import Blueprint, jsonify, request

from config.db import get_db
from utils.json import to_jsonable
from utils.validators import require_fields


admin_courses_bp = Blueprint("admin_courses", __name__)


def _serialize_course(course, assignment_count=0):
    return {
        "id": str(course["_id"]),
        "name": course.get("name", ""),
        "description": course.get("description", ""),
        "status": course.get("status", "active"),
        "createdAt": course.get("createdAt"),
        "updatedAt": course.get("updatedAt"),
        "assignmentCount": assignment_count,
    }


def _serialize_material(material):
    return {
        "id": str(material["_id"]),
        "courseId": str(material["courseId"]),
        "dayNumber": int(material.get("dayNumber", 1)),
        "title": material.get("title", ""),
        "content": material.get("content", ""),
        "createdAt": material.get("createdAt"),
        "updatedAt": material.get("updatedAt"),
    }


@admin_courses_bp.route("", methods=["GET"])
@admin_courses_bp.route("/", methods=["GET"])
def list_courses():
    db = get_db()
    courses = list(db.courses.find({}).sort("createdAt", -1))
    out = []
    for course in courses:
        assignment_count = db.course_assignments.count_documents({"courseId": course["_id"]})
        out.append(_serialize_course(course, assignment_count))
    return jsonify({"courses": to_jsonable(out)})


@admin_courses_bp.route("", methods=["POST"])
@admin_courses_bp.route("/", methods=["POST"])
def create_course():
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["name"])
    if not ok:
        return jsonify({"error": msg}), 400

    name = str(payload["name"]).strip()
    if not name:
        return jsonify({"error": "Course name is required"}), 400

    db = get_db()
    existing = db.courses.find_one({"nameLower": name.lower()})
    if existing:
        return jsonify({"error": "Course name already exists"}), 409

    now = datetime.utcnow()
    doc = {
        "name": name,
        "nameLower": name.lower(),
        "description": str(payload.get("description") or "").strip(),
        "status": "active",
        "createdAt": now,
        "updatedAt": now,
    }
    res = db.courses.insert_one(doc)
    return jsonify({"course": to_jsonable(_serialize_course({**doc, "_id": res.inserted_id}))}), 201


@admin_courses_bp.route("/<course_id>", methods=["PUT", "PATCH"])
@admin_courses_bp.route("/<course_id>/", methods=["PUT", "PATCH"])
def update_course(course_id: str):
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["name"])
    if not ok:
        return jsonify({"error": msg}), 400

    try:
        oid = ObjectId(course_id)
    except Exception:
        return jsonify({"error": "Invalid course id"}), 400

    name = str(payload["name"]).strip()
    if not name:
        return jsonify({"error": "Course name is required"}), 400

    db = get_db()
    course = db.courses.find_one({"_id": oid})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    duplicate = db.courses.find_one({"_id": {"$ne": oid}, "nameLower": name.lower()})
    if duplicate:
        return jsonify({"error": "Course name already exists"}), 409

    update = {
        "name": name,
        "nameLower": name.lower(),
        "description": str(payload.get("description") or "").strip(),
        "updatedAt": datetime.utcnow(),
    }
    db.courses.update_one({"_id": oid}, {"$set": update})
    updated = db.courses.find_one({"_id": oid})
    assignment_count = db.course_assignments.count_documents({"courseId": oid})
    return jsonify({"course": to_jsonable(_serialize_course(updated, assignment_count))})


@admin_courses_bp.route("/<course_id>", methods=["DELETE"])
@admin_courses_bp.route("/<course_id>/", methods=["DELETE"])
def delete_course(course_id: str):
    db = get_db()
    try:
        oid = ObjectId(course_id)
    except Exception:
        return jsonify({"error": "Invalid course id"}), 400

    course = db.courses.find_one({"_id": oid})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    db.courses.delete_one({"_id": oid})
    db.course_assignments.delete_many({"courseId": oid})
    db.course_materials.delete_many({"courseId": oid})
    return jsonify({"message": "Course deleted"})


@admin_courses_bp.route("/<course_id>/assign", methods=["POST"])
@admin_courses_bp.route("/<course_id>/assign/", methods=["POST"])
def assign_course(course_id: str):
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userIds"])
    if not ok:
        return jsonify({"error": msg}), 400

    user_ids = payload.get("userIds") or []
    if not isinstance(user_ids, list) or len(user_ids) == 0:
        return jsonify({"error": "userIds must be a non-empty list"}), 400

    db = get_db()
    try:
        oid = ObjectId(course_id)
    except Exception:
        return jsonify({"error": "Invalid course id"}), 400

    course = db.courses.find_one({"_id": oid})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    now = datetime.utcnow()
    assigned = 0
    for user_id in user_ids:
        normalized = str(user_id).strip()
        if not normalized:
            continue
        user = db.users.find_one({"userId": normalized, "role": "answerer"})
        if not user:
            continue
        db.course_assignments.update_one(
            {"courseId": oid, "userId": normalized},
            {"$setOnInsert": {"createdAt": now}, "$set": {"updatedAt": now, "status": "assigned"}},
            upsert=True,
        )
        assigned += 1

    return jsonify({"message": "Assigned", "assigned": assigned})


@admin_courses_bp.route("/<course_id>/materials", methods=["GET"])
@admin_courses_bp.route("/<course_id>/materials/", methods=["GET"])
def list_course_materials(course_id: str):
    db = get_db()
    try:
        oid = ObjectId(course_id)
    except Exception:
        return jsonify({"error": "Invalid course id"}), 400

    course = db.courses.find_one({"_id": oid})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    materials = list(db.course_materials.find({"courseId": oid}).sort([("dayNumber", 1), ("createdAt", 1)]))
    return jsonify({"materials": to_jsonable([_serialize_material(m) for m in materials])})


@admin_courses_bp.route("/<course_id>/materials", methods=["POST"])
@admin_courses_bp.route("/<course_id>/materials/", methods=["POST"])
def create_course_material(course_id: str):
    payload = request.get_json(silent=True) or {}

    try:
        oid = ObjectId(course_id)
    except Exception:
        return jsonify({"error": "Invalid course id"}), 400

    db = get_db()
    course = db.courses.find_one({"_id": oid})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    now = datetime.utcnow()
    doc = {
        "courseId": oid,
        "dayNumber": int((payload.get("dayNumber") or 1)),
        "title": str(payload.get("title") or "").strip(),
        "content": str(payload.get("content") or "").strip(),
        "createdAt": now,
        "updatedAt": now,
    }
    if doc["dayNumber"] < 1:
        return jsonify({"error": "dayNumber must be at least 1"}), 400
    if not doc["title"]:
        return jsonify({"error": "title is required"}), 400
    if not doc["content"]:
        return jsonify({"error": "content is required"}), 400

    res = db.course_materials.insert_one(doc)
    return jsonify({"material": to_jsonable(_serialize_material({**doc, "_id": res.inserted_id}))}), 201


@admin_courses_bp.route("/materials/<material_id>", methods=["PUT", "PATCH"])
@admin_courses_bp.route("/materials/<material_id>/", methods=["PUT", "PATCH"])
def update_course_material(material_id: str):
    payload = request.get_json(silent=True) or {}

    db = get_db()
    try:
        oid = ObjectId(material_id)
    except Exception:
        return jsonify({"error": "Invalid material id"}), 400

    material = db.course_materials.find_one({"_id": oid})
    if not material:
        return jsonify({"error": "Material not found"}), 404

    update = {
        "dayNumber": int((payload.get("dayNumber") or 1)),
        "title": str(payload.get("title") or "").strip(),
        "content": str(payload.get("content") or "").strip(),
        "updatedAt": datetime.utcnow(),
    }
    if update["dayNumber"] < 1:
        return jsonify({"error": "dayNumber must be at least 1"}), 400
    if not update["title"]:
        return jsonify({"error": "title is required"}), 400
    if not update["content"]:
        return jsonify({"error": "content is required"}), 400

    db.course_materials.update_one({"_id": oid}, {"$set": update})
    updated = db.course_materials.find_one({"_id": oid})
    return jsonify({"material": to_jsonable(_serialize_material(updated))})


@admin_courses_bp.route("/materials/<material_id>", methods=["DELETE"])
@admin_courses_bp.route("/materials/<material_id>/", methods=["DELETE"])
def delete_course_material(material_id: str):
    db = get_db()
    try:
        oid = ObjectId(material_id)
    except Exception:
        return jsonify({"error": "Invalid material id"}), 400

    material = db.course_materials.find_one({"_id": oid})
    if not material:
        return jsonify({"error": "Material not found"}), 404

    db.course_materials.delete_one({"_id": oid})
    return jsonify({"message": "Material deleted"})
