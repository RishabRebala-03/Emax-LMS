from flask import Blueprint, jsonify, request
from datetime import datetime
from bson import ObjectId

from config.db import get_db
from utils.json import to_jsonable
from routes.admin_courses import _ensure_default_course_materials
from utils.validators import require_fields
from services.scoring import compute_result

answerer_bp = Blueprint("answerer", __name__)

@answerer_bp.get("/dashboard")
def dashboard():
    """Return answerer insights.

    Query param: userId
    """
    userId = (request.args.get("userId") or "").strip()
    if not userId:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    # Use results collection for insights
    results = list(db.results.find({"userId": userId}))
    testsTaken = len(results)
    testsPassed = sum(1 for r in results if r.get("passed") is True)
    bestScore = max([float(r.get("percentage", 0.0)) for r in results], default=0.0)
    avgScore = round(sum([float(r.get("percentage", 0.0)) for r in results]) / testsTaken, 2) if testsTaken else 0.0

    # Simple streak: consecutive passes from most recent backwards
    results_sorted = sorted(results, key=lambda r: r.get("submittedAt") or datetime.min, reverse=True)
    streak = 0
    for r in results_sorted:
        if r.get("passed") is True:
            streak += 1
        else:
            break

    return jsonify({
        "insights": {
            "testsTaken": testsTaken,
            "testsPassed": testsPassed,
            "avgScore": avgScore,
            "bestScore": bestScore,
            "streak": streak,
        }
    })


@answerer_bp.get("/history")
def get_history():
    """Return test history for a user.

    Query param: userId
    """
    userId = (request.args.get("userId") or "").strip()
    if not userId:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    
    # Get all results for this user, sorted by submission date (most recent first)
    results = list(db.results.find({"userId": userId}).sort("submittedAt", -1))
    
    history = []
    for r in results:
        # Get exam name
        exam = db.exams.find_one({"_id": r.get("examId")})
        exam_name = exam.get("name", "Unknown Test") if exam else "Unknown Test"
        
        history.append({
            "attemptId": str(r.get("_id")),
            "examId": str(r.get("examId")),
            "testName": exam_name,
            "submittedAt": r.get("submittedAt").isoformat() if r.get("submittedAt") else None,
            "scoredMarks": r.get("scoredMarks", 0),
            "totalMarks": r.get("totalMarks", 0),
            "percentage": round(float(r.get("percentage", 0.0)), 2),
            "passed": r.get("passed", False),
            "timeSpentSec": r.get("timeSpentSec", 0),
        })
    
    return jsonify({"history": to_jsonable(history)})


@answerer_bp.get("/tests")
def list_assigned_tests():
    """List tests assigned to a user.

    Query param: userId
    """
    userId = (request.args.get("userId") or "").strip()
    if not userId:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    assignments = list(db.exam_assignments.find({"userId": userId}))
    exam_ids = [a.get("examId") for a in assignments if a.get("examId")]

    exams = list(db.exams.find({"_id": {"$in": exam_ids}})) if exam_ids else []

    out = []
    for e in exams:
        passing_percentage = int(e.get("passingPercentage", 40))

        # Get questions to calculate total marks and determine question types
        qs = list(db.questions.find({"examId": e["_id"]}))
        
        # Calculate total marks from actual questions
        total_marks = sum(int(q.get("marks", 1)) for q in qs) if qs else int(e.get("questionCount", 0))
        
        # Determine question types
        question_types = set()
        for q in qs:
            qtype = q.get("type", "")
            if qtype == "mcq":
                question_types.add("MCQ")
            elif qtype == "multiple":
                question_types.add("Multiple Choice")
            elif qtype == "text":
                question_types.add("Text")
        
        question_types_str = ", ".join(sorted(question_types)) if question_types else "Mixed"

        has_attempted = db.attempts.find_one({
            "examId": e["_id"],
            "userId": userId,
            "status": "submitted"
        }) is not None
        
        out.append({
            "id": str(e["_id"]),
            "name": e.get("name"),
            "duration": int(e.get("duration", 0)),
            "questions": int(e.get("questionCount", 0)),
            "sections": e.get("sections", []),
            "status": e.get("status", "draft"),
            "totalMarks": total_marks,
            "passingPercentage": passing_percentage,
            "questionTypes": question_types_str,
            "attempted": has_attempted,
        })

    return jsonify({"tests": to_jsonable(out)})


@answerer_bp.get("/courses")
def list_assigned_courses():
    userId = (request.args.get("userId") or "").strip()
    if not userId:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    assignments = list(db.course_assignments.find({"userId": userId}))
    course_ids = [a.get("courseId") for a in assignments if a.get("courseId")]
    courses = list(db.courses.find({"_id": {"$in": course_ids}})) if course_ids else []

    for course_id in course_ids:
        _ensure_default_course_materials(db, course_id)

    materials_by_course = {}
    if course_ids:
        materials = list(db.course_materials.find({"courseId": {"$in": course_ids}}))
        for material in materials:
            course_key = str(material["courseId"])
            materials_by_course.setdefault(course_key, []).append(material)

    out = []
    for course in courses:
        material_items = materials_by_course.get(str(course["_id"]), [])
        out.append({
            "id": str(course["_id"]),
            "name": course.get("name", ""),
            "description": course.get("description", ""),
            "status": course.get("status", "active"),
            "materialCount": len(material_items),
            "daysCovered": len({int(m.get("dayNumber", 1)) for m in material_items}),
            "createdAt": course.get("createdAt"),
        })

    out.sort(key=lambda item: item.get("name", "").lower())
    return jsonify({"courses": to_jsonable(out)})


@answerer_bp.get("/courses/<course_id>/materials")
def get_course_materials(course_id: str):
    userId = (request.args.get("userId") or "").strip()
    if not userId:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    try:
        oid = ObjectId(course_id)
    except Exception:
        return jsonify({"error": "Invalid course id"}), 400

    assigned = db.course_assignments.find_one({"courseId": oid, "userId": userId})
    if not assigned:
        return jsonify({"error": "Course not assigned to this user"}), 403

    course = db.courses.find_one({"_id": oid})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    _ensure_default_course_materials(db, oid)
    materials = list(db.course_materials.find({"courseId": oid}).sort([("dayNumber", 1), ("createdAt", 1)]))
    out = []
    for material in materials:
        out.append({
            "id": str(material["_id"]),
            "dayNumber": int(material.get("dayNumber", 1)),
            "title": material.get("title", ""),
            "content": material.get("content", ""),
            "contentType": material.get("contentType", "plain_text"),
            "contentJson": material.get("contentJson"),
            "estimatedMinutes": int(material.get("estimatedMinutes", 0) or 0),
            "summary": material.get("summary", ""),
            "createdAt": material.get("createdAt"),
        })

    return jsonify({
        "course": to_jsonable({
            "id": str(course["_id"]),
            "name": course.get("name", ""),
            "description": course.get("description", ""),
        }),
        "materials": to_jsonable(out),
    })


@answerer_bp.get("/tests/<exam_id>")
def get_test_for_taker(exam_id: str):
    """Return exam + questions for taking the test.

    Query param: userId (optional - if you want to validate assignment)
    
    IMPORTANT: we do NOT send correctAnswer to the test taker.
    """
    userId = (request.args.get("userId") or "").strip()

    db = get_db()
    try:
        oid = ObjectId(exam_id)
    except Exception:
        return jsonify({"error": "Invalid exam id"}), 400

    exam = db.exams.find_one({"_id": oid})
    if not exam:
        return jsonify({"error": "Exam not found"}), 404

    passing_percentage = int(exam.get("passingPercentage", 40))

    if userId:
        assigned = db.exam_assignments.find_one({"examId": oid, "userId": userId})
        if not assigned:
            return jsonify({"error": "Exam not assigned to this user"}), 403

    qs = list(db.questions.find({"examId": oid}))
    
    # Calculate total marks and question types
    total_marks = sum(int(q.get("marks", 1)) for q in qs) if qs else int(exam.get("questionCount", 0))
    
    question_types = set()
    for q in qs:
        qtype = q.get("type", "")
        if isinstance(q.get("correctAnswer"), list) or qtype in ("multiple", "msq"):
            question_types.add("Multiple Choice")
        elif qtype == "mcq":
            question_types.add("MCQ")
        elif qtype == "text":
            question_types.add("Text")
    
    question_types_str = ", ".join(sorted(question_types)) if question_types else "Mixed"
    
    out_questions = []
    for q in qs:
        out_questions.append({
            "id": str(q.get("qid") or q.get("_id")),
            "type": q.get("type"),
            "question": q.get("question"),
            "options": q.get("options", []),
            # Preserve only the answer shape so the client can safely detect
            # multi-select questions without leaking the actual correct answer.
            "correctAnswer": [] if isinstance(q.get("correctAnswer"), list) else "",
            "section": q.get("section"),
            "marks": int(q.get("marks", 0)),
        })

    return jsonify({
        "test": to_jsonable({
            "id": str(exam["_id"]),
            "testName": exam.get("name"),
            "duration": int(exam.get("duration", 0)),
            "sections": exam.get("sections", []),
            "questions": out_questions,
            "totalMarks": total_marks,
            "passingPercentage": passing_percentage,
            "questionTypes": question_types_str,
        })
    })


@answerer_bp.post("/attempts/start")
def start_attempt():
    """Create an attempt document.

    Payload: {"userId", "examId"}
    Returns: {"attemptId"}
    """
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userId", "examId"])
    if not ok:
        return jsonify({"error": msg}), 400

    db = get_db()
    userId = str(payload["userId"]).strip()
    try:
        exam_oid = ObjectId(payload["examId"])
    except Exception:
        return jsonify({"error": "Invalid examId"}), 400

    # verify assignment
    if not db.exam_assignments.find_one({"examId": exam_oid, "userId": userId}):
        return jsonify({"error": "Exam not assigned"}), 403

    # ❌ Block if already submitted
    submitted = db.attempts.find_one({
        "examId": exam_oid,
        "userId": userId,
        "status": "submitted"
    })
    if submitted:
        return jsonify({"error": "Test already attempted"}), 409

    # Resume in-progress attempt if exists
    existing = db.attempts.find_one({
        "examId": exam_oid,
        "userId": userId,
        "status": "in_progress"
    })
    if existing:
        return jsonify({"attemptId": str(existing["_id"])})

    now = datetime.utcnow()
    attempt_doc = {
        "examId": exam_oid,
        "userId": userId,
        "status": "in_progress",
        "answers": [],
        "startedAt": now,
        "updatedAt": now,
        "submittedAt": None,
        "timeSpentSec": 0,
    }
    res = db.attempts.insert_one(attempt_doc)
    return jsonify({"attemptId": str(res.inserted_id)})


@answerer_bp.put("/attempts/<attempt_id>/save")
def save_attempt(attempt_id: str):
    """Save answers while test is in progress.

    Payload: {"answers": [...], "timeSpentSec": 123}
    """
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["answers"])
    if not ok:
        return jsonify({"error": msg}), 400

    db = get_db()
    try:
        oid = ObjectId(attempt_id)
    except Exception:
        return jsonify({"error": "Invalid attempt id"}), 400

    attempt = db.attempts.find_one({"_id": oid})
    if not attempt:
        return jsonify({"error": "Attempt not found"}), 404
    if attempt.get("status") != "in_progress":
        return jsonify({"error": "Attempt not in progress"}), 400

    update = {
        "answers": payload.get("answers") or [],
        "updatedAt": datetime.utcnow(),
    }
    if payload.get("timeSpentSec") is not None:
        update["timeSpentSec"] = int(payload.get("timeSpentSec") or 0)

    db.attempts.update_one({"_id": oid}, {"$set": update})
    return jsonify({"message": "Saved"})


@answerer_bp.route("/attempts/<attempt_id>/submit", methods=["POST"])
def submit_attempt(attempt_id):
    payload = request.get_json(silent=True) or {}
    answers = payload.get("answers", [])
    time_spent = int(payload.get("timeSpentSec", 0))

    db = get_db()

    attempt = db.attempts.find_one({"_id": ObjectId(attempt_id)})
    if not attempt:
        return jsonify({"error": "Attempt not found"}), 404

    # ✅ ADD THIS BLOCK
    if attempt.get("status") == "submitted":
        return jsonify({"error": "Attempt already submitted"}), 409

    exam_id = attempt["examId"]
    exam = db.exams.find_one({"_id": exam_id})
    if not exam:
        return jsonify({"error": "Exam not found"}), 404

    passing_percentage = float(exam.get("passingPercentage", 40))

    questions = list(db.questions.find({"examId": exam_id}))

    computed = compute_result(questions, answers, passing_percentage)
    section_wise = {
        item["section"]: {
            "total": item["totalMarks"],
            "scored": item["scoredMarks"],
        }
        for item in computed["sectionBreakdown"]
    }
    question_review = [
        {
            "questionId": item["questionId"],
            "isCorrect": item["isCorrect"],
            "userAnswer": item["userAnswer"],
            "correctAnswer": item["correctAnswer"],
            "marks": item["marks"],
            "section": item["section"],
        }
        for item in computed["review"]
    ]

    result_doc = {
        "attemptId": attempt_id,
        "examId": exam_id,
        "userId": attempt["userId"],
        "totalMarks": computed["totalMarks"],
        "scoredMarks": computed["scoredMarks"],
        "percentage": computed["percentage"],
        "passed": computed["passed"],
        "percentile": 0,
        "sectionWise": section_wise,
        "questionReview": question_review,
        "submittedAt": datetime.utcnow(),
        "timeSpentSec": time_spent,
    }

    # Insert into database (this adds _id field)
    insert_result = db.results.insert_one(result_doc)

    # Update attempt status
    db.attempts.update_one(
        {"_id": ObjectId(attempt_id)},
        {"$set": {"status": "submitted"}}
    )

    # ✅ FIX: Convert ALL ObjectId fields to strings for JSON response
    response_data = {
        "attemptId": str(result_doc["attemptId"]),
        "examId": str(result_doc["examId"]),
        "userId": str(result_doc["userId"]),
        "totalMarks": result_doc["totalMarks"],
        "scoredMarks": result_doc["scoredMarks"],
        "percentage": result_doc["percentage"],
        "passed": result_doc["passed"],
        "percentile": result_doc["percentile"],
        "sectionWise": result_doc["sectionWise"],
        "questionReview": result_doc["questionReview"],
        # Don't include submittedAt and timeSpentSec in response if not needed
        # or convert datetime to string if needed:
        # "submittedAt": result_doc["submittedAt"].isoformat(),
        # "timeSpentSec": result_doc["timeSpentSec"],
    }

    return jsonify(response_data)

@answerer_bp.get("/results/<attempt_id>")
def get_result(attempt_id: str):
    db = get_db()
    try:
        oid = ObjectId(attempt_id)
    except Exception:
        return jsonify({"error": "Invalid attempt id"}), 400

    res = db.results.find_one({"attemptId": oid})
    if not res:
        return jsonify({"error": "Result not found"}), 404

    out = {**res}
    out["id"] = str(out.pop("_id"))
    out["attemptId"] = str(out.get("attemptId"))
    out["examId"] = str(out.get("examId"))

    return jsonify({"result": to_jsonable(out)})
