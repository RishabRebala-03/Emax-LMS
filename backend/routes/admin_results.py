from flask import Blueprint, jsonify
from bson import ObjectId
from typing import Optional
from config.db import get_db
from utils.json import to_jsonable

admin_results_bp = Blueprint("admin_results", __name__)


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


def _find_user_with_profile(db, user_identifier: str) -> Optional[dict]:
    if not user_identifier:
        return None

    normalized = str(user_identifier).strip()
    normalized_email = normalized.lower()

    user = db.users.find_one({
        "$or": [
            {"userId": normalized},
            {"naxUnid": normalized},
            {"studentId": normalized},
            {"email": normalized_email},
        ]
    })

    registration = db.student_registrations.find_one({
        "$or": [
            {"naxUnid": normalized},
            {"studentId": normalized},
            {"email": normalized_email},
        ]
    })

    if user:
        return _merge_registration_fields(user, registration)

    if registration:
        synthetic_user = {
            "userId": normalized,
            "naxUnid": registration.get("naxUnid"),
            "studentId": registration.get("studentId"),
            "email": registration.get("email"),
            "name": registration.get("studentName"),
        }
        return _merge_registration_fields(synthetic_user, registration)

    return None


@admin_results_bp.route("/tests", methods=["GET"])
def get_tests_with_results():
    """Get all tests with their result statistics."""
    db = get_db()
    
    exams = list(db.exams.find({}, {"questions": 0}))
    tests_data = []
    
    for exam in exams:
        exam_id = exam["_id"]
        
        # Get all results for this exam
        results = list(db.results.find({"examId": exam_id}))
        
        total_attempts = len(results)
        if total_attempts == 0:
            tests_data.append({
                "id": str(exam_id),
                "name": exam.get("name", "Untitled Test"),
                "duration": int(exam.get("duration", 0)),
                "questions": int(exam.get("questionCount", 0)),
                "totalAttempts": 0,
                "avgScore": 0,
                "passRate": 0,
            })
            continue
        
        # Calculate statistics
        total_percentage = sum(r.get("percentage", 0) for r in results)
        avg_score = total_percentage / total_attempts if total_attempts > 0 else 0
        
        passed_count = sum(1 for r in results if r.get("passed", False))
        pass_rate = (passed_count / total_attempts * 100) if total_attempts > 0 else 0
        
        tests_data.append({
            "id": str(exam_id),
            "name": exam.get("name", "Untitled Test"),
            "duration": int(exam.get("duration", 0)),
            "questions": int(exam.get("questionCount", 0)),
            "totalAttempts": total_attempts,
            "avgScore": round(avg_score, 2),
            "passRate": round(pass_rate, 2),
        })
    
    return jsonify({"tests": to_jsonable(tests_data)})


@admin_results_bp.route("/tests/<exam_id>/users", methods=["GET"])
def get_test_user_results(exam_id: str):
    """Get all user results for a specific test."""
    db = get_db()
    
    try:
        oid = ObjectId(exam_id)
    except Exception:
        return jsonify({"error": "Invalid exam id"}), 400
    
    # Verify exam exists
    exam = db.exams.find_one({"_id": oid})
    if not exam:
        return jsonify({"error": "Exam not found"}), 404
    
    # Get all results for this exam
    results = list(db.results.find({"examId": oid}))
    
    # Calculate percentiles
    sorted_results = sorted(results, key=lambda r: r.get("percentage", 0), reverse=True)
    percentile_map = {}
    for idx, result in enumerate(sorted_results):
        percentile = int((idx / len(sorted_results)) * 100) if len(sorted_results) > 0 else 0
        percentile_map[str(result["_id"])] = percentile
    
    user_results = []
    for result in results:
        user = _find_user_with_profile(db, result.get("userId"))
        user_name = user.get("name", result.get("userId")) if user else result.get("userId")
        
        # Format submittedAt with explicit UTC 'Z' suffix
        submitted_at = None
        if result.get("submittedAt"):
            # Ensure the datetime is treated as UTC and formatted with 'Z'
            submitted_at = result.get("submittedAt").isoformat() + 'Z' if not result.get("submittedAt").isoformat().endswith('Z') else result.get("submittedAt").isoformat()
        
        user_results.append({
            "id": str(result["_id"]),
            "userId": result.get("userId"),
            "userName": user_name,
            "collegeName": user.get("collegeName", "") if user else "",
            "percentage": float(result.get("percentage", 0)),
            "scoredMarks": int(result.get("scoredMarks", 0)),
            "totalMarks": int(result.get("totalMarks", 0)),
            "passed": bool(result.get("passed", False)),
            "submittedAt": submitted_at,
            "timeSpentSec": int(result.get("timeSpentSec", 0)),
            "percentile": percentile_map.get(str(result["_id"]), 0),
        })
    
    return jsonify({"results": to_jsonable(user_results)})


@admin_results_bp.route("/<result_id>", methods=["GET"])
def get_detailed_result(result_id: str):
    """Get detailed result including question-by-question breakdown."""
    db = get_db()
    
    try:
        oid = ObjectId(result_id)
    except Exception:
        return jsonify({"error": "Invalid result id"}), 400
    
    result = db.results.find_one({"_id": oid})
    if not result:
        return jsonify({"error": "Result not found"}), 404
    
    user = _find_user_with_profile(db, result.get("userId"))
    user_name = user.get("name", result.get("userId")) if user else result.get("userId")
    
    # Calculate percentile
    exam_id = result.get("examId")
    all_results = list(db.results.find({"examId": exam_id}))
    sorted_results = sorted(all_results, key=lambda r: r.get("percentage", 0), reverse=True)
    percentile = 0
    for idx, r in enumerate(sorted_results):
        if str(r["_id"]) == str(result["_id"]):
            percentile = int((idx / len(sorted_results)) * 100) if len(sorted_results) > 0 else 0
            break
    
    # Format submittedAt with explicit UTC 'Z' suffix
    submitted_at = None
    if result.get("submittedAt"):
        # Ensure the datetime is treated as UTC and formatted with 'Z'
        submitted_at = result.get("submittedAt").isoformat() + 'Z' if not result.get("submittedAt").isoformat().endswith('Z') else result.get("submittedAt").isoformat()
    
    detailed = {
        "id": str(result["_id"]),
        "attemptId": str(result.get("attemptId", result["_id"])),
        "userId": result.get("userId"),
        "userName": user_name,
        "totalMarks": int(result.get("totalMarks", 0)),
        "scoredMarks": int(result.get("scoredMarks", 0)),
        "percentage": float(result.get("percentage", 0)),
        "passed": bool(result.get("passed", False)),
        "percentile": percentile,
        "submittedAt": submitted_at,
        "timeSpentSec": int(result.get("timeSpentSec", 0)),
        "sectionWise": result.get("sectionWise", {}),
        "questionReview": result.get("questionReview", []),
    }
    
    return jsonify({"result": to_jsonable(detailed)})
