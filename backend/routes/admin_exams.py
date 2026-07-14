from flask import Blueprint, jsonify, request
from datetime import datetime
from bson import ObjectId

from config.db import get_db
from utils.json import to_jsonable
from utils.validators import require_fields

admin_exams_bp = Blueprint("admin_exams", __name__)

@admin_exams_bp.route("", methods=["GET"])
@admin_exams_bp.route("/", methods=["GET"])
def list_exams():
    db = get_db()
    exams = list(db.exams.find({}, {"questions": 0}))
    assignments = list(db.exam_assignments.find({}, {"examId": 1, "userId": 1}))
    users = list(db.users.find({}, {"userId": 1, "collegeName": 1}))

    user_college_by_id = {
        str(user.get("userId") or ""): str(user.get("collegeName") or "").strip()
        for user in users
        if user.get("userId")
    }
    assignment_summary = {}
    for assignment in assignments:
        exam_key = str(assignment.get("examId") or "")
        user_id = str(assignment.get("userId") or "").strip()
        if not exam_key or not user_id:
            continue
        summary = assignment_summary.setdefault(exam_key, {"userIds": set(), "colleges": set()})
        summary["userIds"].add(user_id)
        college_name = user_college_by_id.get(user_id, "")
        if college_name:
            summary["colleges"].add(college_name)

    out = []
    for e in exams:
        exam_key = str(e["_id"])
        summary = assignment_summary.get(exam_key, {"userIds": set(), "colleges": set()})
        out.append({
            "id": exam_key,
            "name": e.get("name"),
            "duration": int(e.get("duration", 0)),
            "questions": int(e.get("questionCount", 0)),
            "sections": e.get("sections", []),
            "passingPercentage": int(e.get("passingPercentage", 40)),
            "createdAt": e.get("createdAt").isoformat() if e.get("createdAt") else None,
            "updatedAt": e.get("updatedAt").isoformat() if e.get("updatedAt") else None,
            "status": e.get("status", "draft"),
            "assignmentCount": len(summary["userIds"]),
            "assignedColleges": sorted(summary["colleges"]),
        })
    out.sort(key=lambda x: x.get("createdAt") or "", reverse=True)
    return jsonify({"tests": to_jsonable(out)})


@admin_exams_bp.route("", methods=["POST"])
@admin_exams_bp.route("/", methods=["POST"])
def create_exam():
    """Create exam + questions.

    Payload:
    {
      "testName": "...",
      "duration": 60,
      "passingPercentage": 40,
      "sections": ["General"],
      "questions": [...]
    }
    """
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["testName", "duration", "sections", "questions"])
    if not ok:
        return jsonify({"error": msg}), 400

    db = get_db()

    testName = str(payload["testName"]).strip()
    duration = int(payload["duration"])
    passing_percentage = int(payload.get("passingPercentage", 40))
    if not (1 <= passing_percentage <= 100):
        return jsonify({"error": "passingPercentage must be between 1 and 100"}), 400

    sections_input = payload.get("sections") or []
    questions = payload.get("questions") or []

    sections = []
    for s in sections_input:
        if isinstance(s, dict):
            sections.append(s.get("name", ""))
        else:
            sections.append(str(s))
    sections = [s for s in sections if s]

    if not isinstance(sections, list) or len(sections) == 0:
        return jsonify({"error": "sections must be a non-empty list"}), 400
    if not isinstance(questions, list) or len(questions) == 0:
        return jsonify({"error": "questions must be a non-empty list"}), 400

    now = datetime.utcnow()

    exam_doc = {
        "name": testName,
        "duration": duration,
        "passingPercentage": passing_percentage,
        "sections": sections,
        "status": "active",
        "questionCount": len(questions),
        "createdAt": now,
        "updatedAt": now,
    }

    exam_res = db.exams.insert_one(exam_doc)
    exam_id = exam_res.inserted_id

    q_docs = []
    for q in questions:
        if not q.get("type") or not q.get("question") or not q.get("section"):
            continue
        q_docs.append({
            "examId": exam_id,
            "qid": str(q.get("id") or ""),
            "type": q.get("type"),
            "question": q.get("question"),
            "options": q.get("options", []),
            "correctAnswer": q.get("correctAnswer"),
            "section": q.get("section"),
            "marks": int(q.get("marks", 0)),
            "createdAt": now,
        })

    if len(q_docs) == 0:
        db.exams.delete_one({"_id": exam_id})
        return jsonify({"error": "No valid questions provided"}), 400

    db.questions.insert_many(q_docs)

    return jsonify({
        "test": to_jsonable({
            "id": str(exam_id),
            "name": exam_doc["name"],
            "duration": exam_doc["duration"],
            "passingPercentage": exam_doc["passingPercentage"],
            "questions": exam_doc["questionCount"],
            "sections": exam_doc["sections"],
            "createdAt": exam_doc["createdAt"].isoformat(),
            "status": exam_doc["status"],
        })
    }), 201


@admin_exams_bp.route("/<exam_id>", methods=["GET"])
@admin_exams_bp.route("/<exam_id>/", methods=["GET"])
def get_exam(exam_id: str):
    db = get_db()
    try:
        oid = ObjectId(exam_id)
    except Exception:
        return jsonify({"error": "Invalid exam id"}), 400

    exam = db.exams.find_one({"_id": oid})
    if not exam:
        return jsonify({"error": "Exam not found"}), 404

    qs = list(db.questions.find({"examId": oid}))

    out_questions = []
    for q in qs:
        out_questions.append({
            "id": str(q.get("qid") or q.get("_id")),
            "_id": str(q.get("_id")),
            "type": q.get("type"),
            "question": q.get("question"),
            "options": q.get("options", []),
            "correctAnswer": q.get("correctAnswer"),
            "section": q.get("section"),
            "marks": int(q.get("marks", 0)),
        })

    return jsonify({
        "test": to_jsonable({
            "id": str(exam["_id"]),
            "testName": exam.get("name"),
            "duration": int(exam.get("duration", 0)),
            "passingPercentage": int(exam.get("passingPercentage", 40)),
            "sections": exam.get("sections", []),
            "status": exam.get("status", "draft"),
            "questions": out_questions,
            "createdAt": exam.get("createdAt"),
            "updatedAt": exam.get("updatedAt"),
        })
    })


@admin_exams_bp.route("/<exam_id>", methods=["PUT"])
@admin_exams_bp.route("/<exam_id>/", methods=["PUT"])
def update_exam(exam_id: str):
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["testName", "duration", "sections", "questions"])
    if not ok:
        return jsonify({"error": msg}), 400

    db = get_db()
    try:
        oid = ObjectId(exam_id)
    except Exception:
        return jsonify({"error": "Invalid exam id"}), 400

    exam = db.exams.find_one({"_id": oid})
    if not exam:
        return jsonify({"error": "Exam not found"}), 404

    passing_percentage = int(payload.get("passingPercentage", 40))
    if not (1 <= passing_percentage <= 100):
        return jsonify({"error": "passingPercentage must be between 1 and 100"}), 400

    now = datetime.utcnow()
    sections_input = payload.get("sections") or []

    sections = []
    for s in sections_input:
        if isinstance(s, dict):
            sections.append(s.get("name", ""))
        else:
            sections.append(str(s))
    sections = [s for s in sections if s]

    update = {
        "name": str(payload["testName"]).strip(),
        "duration": int(payload["duration"]),
        "passingPercentage": passing_percentage,
        "sections": sections,
        "questionCount": len(payload.get("questions") or []),
        "updatedAt": now,
    }

    db.exams.update_one({"_id": oid}, {"$set": update})

    db.questions.delete_many({"examId": oid})
    q_docs = []
    for q in payload.get("questions") or []:
        q_docs.append({
            "examId": oid,
            "qid": str(q.get("id") or ""),
            "type": q.get("type"),
            "question": q.get("question"),
            "options": q.get("options", []),
            "correctAnswer": q.get("correctAnswer"),
            "section": q.get("section"),
            "marks": int(q.get("marks", 0)),
            "createdAt": now,
        })

    if len(q_docs) > 0:
        db.questions.insert_many(q_docs)

    return jsonify({"message": "Updated"})


@admin_exams_bp.route("/<exam_id>", methods=["DELETE"])
@admin_exams_bp.route("/<exam_id>/", methods=["DELETE"])
def delete_exam(exam_id: str):
    db = get_db()
    try:
        oid = ObjectId(exam_id)
    except Exception:
        return jsonify({"error": "Invalid exam id"}), 400

    exam = db.exams.find_one({"_id": oid})
    if not exam:
        return jsonify({"error": "Exam not found"}), 404

    db.exams.delete_one({"_id": oid})
    db.questions.delete_many({"examId": oid})
    db.exam_assignments.delete_many({"examId": oid})
    db.attempts.delete_many({"examId": oid})
    db.results.delete_many({"examId": oid})
    return jsonify({"message": "Deleted"})


@admin_exams_bp.route("/<exam_id>/publish", methods=["POST"])
@admin_exams_bp.route("/<exam_id>/publish/", methods=["POST"])
def publish_exam(exam_id: str):
    db = get_db()
    try:
        oid = ObjectId(exam_id)
    except Exception:
        return jsonify({"error": "Invalid exam id"}), 400

    res = db.exams.update_one({"_id": oid}, {"$set": {"status": "active", "updatedAt": datetime.utcnow()}})
    if res.matched_count == 0:
        return jsonify({"error": "Exam not found"}), 404
    return jsonify({"message": "Published"})


@admin_exams_bp.route("/<exam_id>/assign", methods=["POST"])
@admin_exams_bp.route("/<exam_id>/assign/", methods=["POST"])
def assign_exam(exam_id: str):
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userIds"])
    if not ok:
        return jsonify({"error": msg}), 400

    userIds = payload.get("userIds")
    if not isinstance(userIds, list) or len(userIds) == 0:
        return jsonify({"error": "userIds must be a non-empty list"}), 400

    db = get_db()
    try:
        oid = ObjectId(exam_id)
    except Exception:
        return jsonify({"error": "Invalid exam id"}), 400

    exam = db.exams.find_one({"_id": oid})
    if not exam:
        return jsonify({"error": "Exam not found"}), 404

    now = datetime.utcnow()
    upserts = 0
    for uid in userIds:
        uid = str(uid).strip()
        if not uid:
            continue
        db.exam_assignments.update_one(
            {"examId": oid, "userId": uid},
            {"$setOnInsert": {"createdAt": now}, "$set": {"status": "assigned", "updatedAt": now}},
            upsert=True,
        )
        upserts += 1

    return jsonify({"message": "Assigned", "assigned": upserts})
