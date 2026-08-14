from flask import Blueprint, jsonify, request, current_app
from datetime import datetime, timedelta
from bson import ObjectId
from werkzeug.utils import secure_filename
import base64
import hashlib
import hmac
import json
import os
import secrets
import smtplib
from urllib import error as urllib_error
from urllib import request as urllib_request
from email.message import EmailMessage

from config.db import get_db
from utils.json import to_jsonable
from routes.admin_courses import _ensure_default_course_materials
from utils.validators import require_fields
from services.scoring import compute_result

answerer_bp = Blueprint("answerer", __name__)

DEFAULT_SMTP_HOST = "smtp.gmail.com"
DEFAULT_SMTP_PORT = 587
DEFAULT_SMTP_USERNAME = "saplearning989@gmail.com"
DEFAULT_SMTP_PASSWORD = "iefv gjbl fzlm pvac"
DEFAULT_SMTP_FROM_EMAIL = "saplearning989@gmail.com"
DEFAULT_SMTP_USE_TLS = True
OTP_EXPIRY_MINUTES = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
SAP_ODATA_SYSTEMS = {
    "SHD": "http://183.82.103.80:8011/sap/opu/odata/SAP/ZBSUSERODATA_SRV/UserLockSet?sap-client=100",
    "EMQ": "http://49.206.197.17:8033/sap/opu/odata/SAP/ZBSUSERODATA_SRV/UserLockSet",
    "EMP": "http://49.206.197.17:8031/sap/opu/odata/SAP/ZBSUSERODATA_SRV/UserLockSet",
    "EMD": "http://49.206.197.17:8006/sap/opu/odata/SAP/ZBSUSERODATA_SRV/UserLockSet",
}
SAP_ODATA_USERNAME = "AITEST1"
SAP_ODATA_PASSWORD = "Naxrita@2026"
SAP_UNLOCK_ACTION = "UnLock"
SAP_UNLOCK_WINDOW_MINUTES = 5
ALLOWED_REGISTRATION_DOCUMENT_EXTENSIONS = {"jpg", "jpeg", "pdf"}

def _normalize_user_id(value: str) -> str:
    return str(value or "").strip()


def _has_value(value) -> bool:
    return value is not None and str(value).strip() != ""


def _registration_document_allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_REGISTRATION_DOCUMENT_EXTENSIONS


def _find_student_registration(db, user: dict) -> dict | None:
    lookup_keys = [
        user.get("naxUnid"),
        user.get("userId"),
        user.get("studentId"),
        user.get("email"),
    ]
    for key in filter(None, lookup_keys):
        reg = db.student_registrations.find_one({
            "$or": [
                {"naxUnid": key},
                {"studentId": key},
                {"email": str(key).strip().lower()},
            ]
        })
        if reg:
            return reg
    return None


def _registration_value(user: dict, registration: dict | None, user_key: str, reg_key: str | None = None):
    value = user.get(user_key)
    if _has_value(value):
        return value
    if registration:
        return registration.get(reg_key or user_key)
    return None


def _name_parts(user: dict, registration: dict | None) -> tuple[str, str]:
    first_name = _registration_value(user, registration, "firstName")
    last_name = _registration_value(user, registration, "lastName")
    if _has_value(first_name) or _has_value(last_name):
        return str(first_name or "").strip(), str(last_name or "").strip()

    full_name = str(_registration_value(user, registration, "name", "studentName") or "").strip()
    if not full_name:
        return "", ""
    parts = full_name.split()
    return parts[0], " ".join(parts[1:])


def _student_registration_profile(user: dict, registration: dict | None) -> dict:
    dob = _registration_value(user, registration, "dob")
    document_url = _registration_value(user, registration, "documentUrl")
    first_name, last_name = _name_parts(user, registration)
    full_name = str(_registration_value(user, registration, "name", "studentName") or f"{first_name} {last_name}").strip()
    stored_first_name = _registration_value(user, registration, "firstName")
    stored_last_name = _registration_value(user, registration, "lastName")
    needs_first_name = not _has_value(stored_first_name)
    needs_last_name = not _has_value(stored_last_name)
    needs_dob = not _has_value(dob)
    needs_document = not _has_value(document_url)
    return {
        "userId": user.get("userId"),
        "naxUnid": _registration_value(user, registration, "naxUnid"),
        "studentName": full_name,
        "firstName": first_name,
        "lastName": last_name,
        "studentId": _registration_value(user, registration, "studentId"),
        "email": _registration_value(user, registration, "email"),
        "collegeEmail": _registration_value(user, registration, "collegeEmail"),
        "mobile": _registration_value(user, registration, "mobile"),
        "gender": _registration_value(user, registration, "gender"),
        "collegeName": _registration_value(user, registration, "collegeName"),
        "courseStream": _registration_value(user, registration, "courseStream"),
        "cgpa": _registration_value(user, registration, "cgpa"),
        "sapCertification": _registration_value(user, registration, "sapCertification"),
        "dob": dob,
        "documentUrl": document_url,
        "documentName": _registration_value(user, registration, "documentName"),
        "needsSapRegistration": needs_first_name or needs_last_name or needs_dob or needs_document,
        "hasSapRegistrationTab": needs_first_name or needs_last_name or needs_dob or needs_document,
        "canEditFirstName": needs_first_name or needs_last_name,
        "canEditLastName": needs_first_name or needs_last_name,
        "canEditDob": needs_dob,
        "canUploadDocument": needs_document,
    }


def _mask_email(email: str) -> str:
    email = (email or "").strip()
    if "@" not in email:
        return email
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = local[0] + "*"
    else:
        masked_local = local[0] + "*" * max(2, len(local) - 2) + local[-1]
    return f"{masked_local}@{domain}"


def _otp_hash(user_id: str, otp: str, salt: str) -> str:
    return hashlib.sha256(f"{user_id}:{otp}:{salt}".encode("utf-8")).hexdigest()


def _extract_sap_error(payload_text: str) -> str:
    if not payload_text:
        return ""
    try:
        payload = json.loads(payload_text)
    except json.JSONDecodeError:
        return payload_text.strip()

    error_obj = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error_obj, dict):
        message_obj = error_obj.get("message")
        if isinstance(message_obj, dict) and message_obj.get("value"):
            return str(message_obj["value"])
        if isinstance(message_obj, str):
            return message_obj
    if isinstance(payload, dict) and payload.get("d"):
        return ""
    return payload_text.strip()


def _sap_system_config(system: str) -> dict:
    """Return server-controlled connection details for a supported SAP system."""
    system_key = str(system or "").strip().upper()
    if system_key not in SAP_ODATA_SYSTEMS:
        raise ValueError(f"Unsupported SAP system: {system_key or 'missing'}")

    return {
        "key": system_key,
        "url": os.getenv(f"SAP_{system_key}_ODATA_URL", "").strip() or SAP_ODATA_SYSTEMS[system_key],
        "username": os.getenv(f"SAP_{system_key}_ODATA_USERNAME", "").strip() or SAP_ODATA_USERNAME,
        "password": os.getenv(f"SAP_{system_key}_ODATA_PASSWORD", "") or SAP_ODATA_PASSWORD,
    }


def _unlock_sap_profile(username: str, system: str) -> dict:
    config = _sap_system_config(system)
    request_body = json.dumps({
        "Username": username,
        "Action": SAP_UNLOCK_ACTION,
    }).encode("utf-8")
    basic_token = base64.b64encode(
        f"{config['username']}:{config['password']}".encode("utf-8")
    ).decode("ascii")

    sap_request = urllib_request.Request(
        config["url"],
        data=request_body,
        method="POST",
        headers={
            "Authorization": f"Basic {basic_token}",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urllib_request.urlopen(sap_request, timeout=20) as response:
            raw_body = response.read().decode("utf-8", errors="replace")
            parsed_body = json.loads(raw_body) if raw_body else {}
            return {
                "ok": True,
                "status": response.getcode(),
                "body": parsed_body,
            }
    except urllib_error.HTTPError as exc:
        raw_body = exc.read().decode("utf-8", errors="replace")
        return {
            "ok": False,
            "status": exc.code,
            "message": _extract_sap_error(raw_body) or f"SAP unlock request failed with status {exc.code}.",
            "body": raw_body,
        }
    except urllib_error.URLError as exc:
        return {
            "ok": False,
            "status": 503,
            "message": f"Unable to reach SAP unlock service: {exc.reason}",
            "body": "",
        }
    except Exception as exc:
        return {
            "ok": False,
            "status": 500,
            "message": f"Unexpected error while unlocking SAP profile: {exc}",
            "body": "",
        }


def _send_otp_email(to_email: str, otp: str, user_name: str) -> None:
    host = os.getenv("SMTP_HOST", DEFAULT_SMTP_HOST).strip() or DEFAULT_SMTP_HOST
    port = int(os.getenv("SMTP_PORT", str(DEFAULT_SMTP_PORT)))
    username = os.getenv("SMTP_USERNAME", DEFAULT_SMTP_USERNAME).strip() or DEFAULT_SMTP_USERNAME
    password = os.getenv("SMTP_PASSWORD", DEFAULT_SMTP_PASSWORD).strip() or DEFAULT_SMTP_PASSWORD
    sender = os.getenv("SMTP_FROM_EMAIL", DEFAULT_SMTP_FROM_EMAIL).strip() or DEFAULT_SMTP_FROM_EMAIL
    use_tls = os.getenv("SMTP_USE_TLS", str(DEFAULT_SMTP_USE_TLS).lower()).lower() not in ("0", "false", "no")
    if not host or not sender:
        raise RuntimeError("SMTP is not configured")

    message = EmailMessage()
    message["Subject"] = "Your SAP account user unlock verification code"
    message["From"] = sender
    message["To"] = to_email
    message.set_content(
        f"Hello {user_name or 'Student'},\n\n"
        f"Your one-time verification code to unlock your SAP account user is: {otp}\n\n"
        f"This code expires in {OTP_EXPIRY_MINUTES} minutes. If you did not request this, you can ignore this email."
    )

    with smtplib.SMTP(host, port, timeout=15) as smtp:
        if use_tls:
            smtp.starttls()
        if username:
            smtp.login(username, password)
        smtp.send_message(message)


@answerer_bp.get("/interview-prep/access")
def get_interview_prep_access():
    userId = _normalize_user_id(request.args.get("userId"))
    if not userId:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    doc = db.interview_prep_assignments.find_one({"userId": userId, "status": "assigned"})
    return jsonify({"hasAccess": doc is not None})


@answerer_bp.get("/sap-registration")
def get_sap_registration_profile():
    userId = _normalize_user_id(request.args.get("userId"))
    if not userId:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    user = db.users.find_one({
        "$or": [{"userId": userId}, {"naxUnid": userId}],
        "role": "answerer",
    }, {"password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404

    registration = _find_student_registration(db, user)
    return jsonify({"profile": to_jsonable(_student_registration_profile(user, registration))})


@answerer_bp.post("/sap-registration/complete")
def complete_sap_registration_profile():
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form.to_dict()
    else:
        data = request.get_json(silent=True) or {}

    ok, msg = require_fields(data, ["userId"])
    if not ok:
        return jsonify({"error": msg}), 400

    userId = _normalize_user_id(data["userId"])
    db = get_db()
    user = db.users.find_one({
        "$or": [{"userId": userId}, {"naxUnid": userId}],
        "role": "answerer",
    })
    if not user:
        return jsonify({"error": "User not found"}), 404

    registration = _find_student_registration(db, user)
    profile = _student_registration_profile(user, registration)
    if not profile["needsSapRegistration"]:
        return jsonify({"error": "SAP registration details are already completed for this student."}), 409

    updates = {}
    first_name = str(data.get("firstName") or profile.get("firstName") or "").strip()
    last_name = str(data.get("lastName") or profile.get("lastName") or "").strip()
    if profile.get("canEditFirstName"):
        if not first_name:
            return jsonify({"error": "First Name is required"}), 400
        updates["firstName"] = first_name
    if profile.get("canEditLastName"):
        if not last_name:
            return jsonify({"error": "Last Name is required"}), 400
        updates["lastName"] = last_name

    full_name = f"{first_name} {last_name}".strip()
    if profile.get("canEditFirstName") or profile.get("canEditLastName"):
        updates["name"] = full_name

    if profile["canEditDob"]:
        dob = str(data.get("dob") or "").strip()
        if not dob:
            return jsonify({"error": "Date of Birth is required"}), 400
        try:
            datetime.strptime(dob, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Date of Birth must be in YYYY-MM-DD format"}), 400
        updates["dob"] = dob

    if profile["canUploadDocument"]:
        uploaded_file = request.files.get("document") or request.files.get("file")
        if not uploaded_file or not uploaded_file.filename:
            return jsonify({"error": "Document upload is required"}), 400

        filename = secure_filename(uploaded_file.filename)
        if not _registration_document_allowed(filename):
            return jsonify({"error": "Invalid file format. Only JPG, JPEG, and PDF files are allowed."}), 400

        uploaded_file.seek(0, os.SEEK_END)
        file_length = uploaded_file.tell()
        uploaded_file.seek(0)
        if file_length > 10 * 1024 * 1024:
            return jsonify({"error": "File size exceeds maximum limit of 10MB"}), 400

        canonical_user_id = str(user.get("naxUnid") or user.get("userId") or userId).strip()
        ext = filename.rsplit(".", 1)[1].lower()
        timestamp = int(datetime.utcnow().timestamp())
        safe_saved_filename = f"{canonical_user_id}_{timestamp}.{ext}"

        docs_dir = os.path.join(current_app.root_path, "uploads", "documents")
        os.makedirs(docs_dir, exist_ok=True)
        uploaded_file.save(os.path.join(docs_dir, safe_saved_filename))

        updates["documentUrl"] = f"/uploads/documents/{safe_saved_filename}"
        updates["documentName"] = uploaded_file.filename

    now = datetime.utcnow()
    user_updates = dict(updates)
    user_updates["sapRegistrationCompletedAt"] = now
    user_updates["updatedAt"] = now
    db.users.update_one({"_id": user["_id"]}, {"$set": user_updates})

    if registration:
        registration_updates = dict(updates)
        registration_updates["studentName"] = full_name
        registration_updates.pop("name", None)
        registration_updates["sapRegistrationCompletedAt"] = now
        registration_updates["updatedAt"] = now
        db.student_registrations.update_one(
            {"_id": registration["_id"]},
            {"$set": registration_updates},
        )

    updated_user = db.users.find_one({"_id": user["_id"]}, {"password": 0})
    updated_registration = _find_student_registration(db, updated_user)
    return jsonify({
        "message": "SAP registration details updated successfully.",
        "profile": to_jsonable(_student_registration_profile(updated_user, updated_registration)),
    })


@answerer_bp.get("/account-security")
def get_account_security():
    userId = _normalize_user_id(request.args.get("userId"))
    if not userId:
        return jsonify({"error": "userId is required"}), 400

    db = get_db()
    user = db.users.find_one({
        "$or": [{"userId": userId}, {"naxUnid": userId}],
        "role": "answerer",
    })
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "account": to_jsonable({
            "userId": user.get("userId"),
            "name": user.get("name"),
            "email": user.get("email"),
            "collegeEmail": user.get("collegeEmail"),
            "isActive": user.get("isActive", True),
            "lastLoginAt": user.get("lastLoginAt"),
            "unlockMethod": "college_email_otp",
            "collegeEmailMasked": _mask_email(user.get("collegeEmail", "")),
        })
    })


@answerer_bp.post("/account-security/otp/request")
def request_account_unlock_otp():
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userId"])
    if not ok:
        return jsonify({"error": msg}), 400

    userId = _normalize_user_id(payload["userId"])
    db = get_db()
    user = db.users.find_one({
        "$or": [{"userId": userId}, {"naxUnid": userId}],
        "role": "answerer",
    })
    if not user:
        return jsonify({"error": "User not found"}), 404

    college_email = str(user.get("collegeEmail") or "").strip().lower()
    if not college_email:
        return jsonify({"error": "College email is not available for this SAP account user"}), 400

    canonical_user_id = str(user.get("userId") or userId).strip()
    now = datetime.utcnow()
    existing_otp = db.account_security_otps.find_one({
        "userId": canonical_user_id,
        "email": college_email,
        "usedAt": None,
    })
    if existing_otp and existing_otp.get("createdAt"):
        retry_at = existing_otp["createdAt"] + timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS)
        if retry_at > now:
            retry_after_seconds = max(1, int((retry_at - now).total_seconds()))
            return jsonify({
                "error": f"Please wait {retry_after_seconds} seconds before requesting a new OTP.",
                "retryAfterSeconds": retry_after_seconds,
            }), 429

    otp = f"{secrets.randbelow(1000000):06d}"
    salt = secrets.token_hex(16)
    expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)
    otp_doc = {
        "userId": canonical_user_id,
        "email": college_email,
        "salt": salt,
        "otpHash": _otp_hash(canonical_user_id, otp, salt),
        "expiresAt": expires_at,
        "attempts": 0,
        "createdAt": now,
        "usedAt": None,
    }

    db.account_security_otps.update_one(
        {"userId": canonical_user_id, "email": college_email},
        {"$set": otp_doc},
        upsert=True,
    )

    try:
        _send_otp_email(college_email, otp, user.get("name", "Student"))
    except Exception as exc:
        return jsonify({
            "error": "Unable to send verification email",
            "details": str(exc),
        }), 503

    return jsonify({
        "message": "Verification code sent to your college email address",
        "expiresInMinutes": OTP_EXPIRY_MINUTES,
        "retryAfterSeconds": OTP_RESEND_COOLDOWN_SECONDS,
        "collegeEmailMasked": _mask_email(college_email),
    })


@answerer_bp.post("/account-security/otp/verify")
def verify_account_unlock_otp():
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userId", "otp"])
    if not ok:
        return jsonify({"error": msg}), 400

    userId = _normalize_user_id(payload["userId"])
    otp = str(payload["otp"]).strip()
    if len(otp) != 6 or not otp.isdigit():
        return jsonify({"error": "Enter a valid 6-digit code"}), 400

    db = get_db()
    user = db.users.find_one({
        "$or": [{"userId": userId}, {"naxUnid": userId}],
        "role": "answerer",
    })
    if not user:
        return jsonify({"error": "User not found"}), 404

    canonical_user_id = str(user.get("userId") or userId).strip()
    college_email = str(user.get("collegeEmail") or "").strip().lower()
    otp_doc = db.account_security_otps.find_one({
        "userId": canonical_user_id,
        "email": college_email,
        "usedAt": None,
    })
    if not otp_doc:
        return jsonify({"error": "No active verification code found. Please request a new one."}), 404

    if otp_doc.get("expiresAt") and otp_doc["expiresAt"] < datetime.utcnow():
        return jsonify({"error": "Verification code has expired. Please request a new one."}), 410

    candidate_hash = _otp_hash(canonical_user_id, otp, otp_doc.get("salt", ""))
    if not hmac.compare_digest(candidate_hash, otp_doc.get("otpHash", "")):
        db.account_security_otps.update_one(
            {"_id": otp_doc["_id"]},
            {"$inc": {"attempts": 1}}
        )
        return jsonify({"error": "Invalid verification code"}), 401

    now = datetime.utcnow()
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"isActive": True, "unlockedAt": now, "unlockMethod": "college_email_otp"}}
    )
    db.account_security_otps.update_one(
        {"_id": otp_doc["_id"]},
        {"$set": {"usedAt": now, "verifiedAt": now, "unlockEligibleUntil": now + timedelta(minutes=SAP_UNLOCK_WINDOW_MINUTES)}}
    )
    return jsonify({
        "message": "OTP verified successfully. You can now unlock the SAP profile.",
        "otpVerified": True,
        "unlockEligibleForMinutes": SAP_UNLOCK_WINDOW_MINUTES,
    })


@answerer_bp.post("/account-security/sap-unlock")
def unlock_sap_profile():
    payload = request.get_json(silent=True) or {}
    ok, msg = require_fields(payload, ["userId", "sapSystem"])
    if not ok:
        return jsonify({"error": msg}), 400

    userId = _normalize_user_id(payload["userId"])
    sap_system = str(payload["sapSystem"] or "").strip().upper()
    if sap_system not in SAP_ODATA_SYSTEMS:
        return jsonify({
            "error": f"Select a valid SAP system ({', '.join(SAP_ODATA_SYSTEMS)})."
        }), 400

    db = get_db()
    user = db.users.find_one({
        "$or": [{"userId": userId}, {"naxUnid": userId}],
        "role": "answerer",
    })
    if not user:
        return jsonify({"error": "User not found"}), 404

    canonical_user_id = str(user.get("userId") or userId).strip()
    college_email = str(user.get("collegeEmail") or "").strip().lower()
    otp_doc = db.account_security_otps.find_one({
        "userId": canonical_user_id,
        "email": college_email,
        "verifiedAt": {"$ne": None},
    }, sort=[("verifiedAt", -1)])

    if not otp_doc:
        return jsonify({"error": "Verify your OTP before unlocking the SAP profile."}), 403

    unlock_eligible_until = otp_doc.get("unlockEligibleUntil")
    if not unlock_eligible_until or unlock_eligible_until < datetime.utcnow():
        return jsonify({"error": "Your OTP verification window has expired. Please request and verify a new OTP."}), 410

    sap_result = _unlock_sap_profile(canonical_user_id, sap_system)
    if not sap_result["ok"]:
        return jsonify({
            "error": sap_result["message"],
            "sapStatus": sap_result["status"],
            "details": sap_result["body"],
        }), sap_result["status"] if isinstance(sap_result["status"], int) else 500

    now = datetime.utcnow()
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "isActive": True,
            "unlockedAt": now,
            "unlockMethod": "sap_odata_otp",
            "lastUnlockedSapSystem": sap_system,
        }}
    )
    db.account_security_otps.update_one(
        {"_id": otp_doc["_id"]},
        {"$set": {"sapUnlockedAt": now, "sapSystem": sap_system}}
    )

    return jsonify({
        "message": f"SAP profile unlocked successfully in {sap_system}.",
        "isActive": True,
        "sapSystem": sap_system,
        "sapResponse": sap_result["body"],
    })

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
