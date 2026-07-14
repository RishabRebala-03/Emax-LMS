# backend/routes/master_data.py
#
# Handles:
#   Admin:  GET/POST/DELETE  /admin/master-data  (genders, streams, certifications)
#   Public: GET              /public/master-data  (read-only, for registration form)
#   Public: GET              /public/next-unid    (preview next NAX_UNID)
#   Public: POST             /public/register     (student self-registration)

from flask import Blueprint, jsonify, request
from datetime import datetime
from bson import ObjectId
from config.db import get_db
from utils.json import to_jsonable

master_data_bp = Blueprint("master_data", __name__)
public_bp = Blueprint("public", __name__)

VALID_CATEGORIES = ("genders", "streams", "certifications", "colleges")

# ─────────────────────────────────────────────
# ADMIN — read all master data
# ─────────────────────────────────────────────
@master_data_bp.get("")
@master_data_bp.get("/")
def get_master_data():
    db = get_db()
    result = {}
    for cat in VALID_CATEGORIES:
        items = list(db.master_data.find({"category": cat}, {"_id": 1, "label": 1, "createdAt": 1}))
        result[cat] = [
            {"id": str(i["_id"]), "label": i["label"], "createdAt": i.get("createdAt")}
            for i in items
        ]
    return jsonify(to_jsonable(result))


# ─────────────────────────────────────────────
# ADMIN — add item to a category
# ─────────────────────────────────────────────
@master_data_bp.post("/<category>")
@master_data_bp.post("/<category>/")
def add_master_item(category: str):
    if category not in VALID_CATEGORIES:
        return jsonify({"error": f"Invalid category. Must be one of {VALID_CATEGORIES}"}), 400

    payload = request.get_json(silent=True) or {}
    label = str(payload.get("label", "")).strip()
    if not label:
        return jsonify({"error": "label is required"}), 400

    db = get_db()
    if db.master_data.find_one({"category": category, "label": {"$regex": f"^{label}$", "$options": "i"}}):
        return jsonify({"error": f"'{label}' already exists in {category}"}), 409

    doc = {
        "category": category,
        "label": label,
        "createdAt": datetime.utcnow(),
    }
    res = db.master_data.insert_one(doc)
    return jsonify(to_jsonable({
        "id": str(res.inserted_id),
        "label": label,
        "createdAt": doc["createdAt"],
    })), 201


# ─────────────────────────────────────────────
# ADMIN — update item in a category
# ─────────────────────────────────────────────
@master_data_bp.patch("/<category>/<item_id>")
@master_data_bp.patch("/<category>/<item_id>/")
def update_master_item(category: str, item_id: str):
    if category not in VALID_CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400

    payload = request.get_json(silent=True) or {}
    label = str(payload.get("label", "")).strip()
    if not label:
        return jsonify({"error": "label is required"}), 400

    db = get_db()
    try:
        q = {"_id": ObjectId(item_id), "category": category}
    except Exception:
        return jsonify({"error": "Invalid id"}), 400

    # Check if new label already exists (case-insensitive, but not the same item)
    existing = db.master_data.find_one({
        "category": category,
        "label": {"$regex": f"^{label}$", "$options": "i"},
        "_id": {"$ne": ObjectId(item_id)}
    })
    if existing:
        return jsonify({"error": f"'{label}' already exists in {category}"}), 409

    result = db.master_data.update_one(q, {"$set": {"label": label}})
    if result.matched_count == 0:
        return jsonify({"error": "Item not found"}), 404
    
    return jsonify(to_jsonable({
        "id": str(item_id),
        "label": label,
        "createdAt": None
    })), 200


# ─────────────────────────────────────────────
# ADMIN — delete item from a category
# ─────────────────────────────────────────────
@master_data_bp.delete("/<category>/<item_id>")
@master_data_bp.delete("/<category>/<item_id>/")
def delete_master_item(category: str, item_id: str):
    if category not in VALID_CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400

    db = get_db()
    try:
        q = {"_id": ObjectId(item_id), "category": category}
    except Exception:
        return jsonify({"error": "Invalid id"}), 400

    result = db.master_data.delete_one(q)
    if result.deleted_count == 0:
        return jsonify({"error": "Item not found"}), 404
    return jsonify({"message": "Deleted"})


# ─────────────────────────────────────────────
# PUBLIC — read master data (for registration form)
# ─────────────────────────────────────────────
@public_bp.get("/master-data")
@public_bp.get("/master-data/")
def public_get_master_data():
    db = get_db()
    result = {}
    for cat in VALID_CATEGORIES:
        items = list(db.master_data.find({"category": cat}, {"_id": 1, "label": 1}))
        result[cat] = [{"id": str(i["_id"]), "label": i["label"]} for i in items]
    return jsonify(to_jsonable(result))


# ─────────────────────────────────────────────
# PUBLIC — preview next NAX_UNID
# ─────────────────────────────────────────────
@public_bp.get("/next-unid")
@public_bp.get("/next-unid/")
def get_next_unid():
    db = get_db()
    count = db.student_registrations.count_documents({})
    next_num = 1500488 + count
    nax_unid = f"NAX_{str(next_num)}"
    return jsonify({"naxUnid": nax_unid})


# ─────────────────────────────────────────────
# PUBLIC — student self-registration
# ─────────────────────────────────────────────
@public_bp.post("/register")
@public_bp.post("/register/")
def student_register():
    payload = request.get_json(silent=True) or {}

    required = ["studentName", "studentId", "email", "mobile",
                "gender", "courseStream", "cgpa", "sapCertification", "collegeName", "collegeEmail"]
    missing = [f for f in required if not payload.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    db = get_db()

    # Duplicate checks against both collections
    if db.student_registrations.find_one({"email": payload["email"].strip().lower()}):
        return jsonify({"error": "An account with this email already exists"}), 409
    if db.student_registrations.find_one({"studentId": payload["studentId"].strip()}):
        return jsonify({"error": "An account with this Student ID already exists"}), 409

    # Generate sequential NAX_UNID (atomic-safe via a counter collection)
    counter = db.counters.find_one_and_update(
        {"_id": "nax_unid"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter.get("seq", 1)
    nax_unid = f"NAX_{str(1500487 + seq)}"

    # Validate CGPA
    try:
        cgpa = float(payload["cgpa"])
        if not (0 <= cgpa <= 10):
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "CGPA must be a number between 0 and 10"}), 400

    now = datetime.utcnow()
    default_password = "Welcome@123"
    student_id = payload["studentId"].strip()
    student_name = payload["studentName"].strip()
    email = payload["email"].strip().lower()
    college_email = payload["collegeEmail"].strip().lower()

    # 1. Insert into student_registrations (unchanged — keeps audit trail)
    reg_doc = {
        "naxUnid": nax_unid,
        "studentName": student_name,
        "studentId": student_id,
        "email": email,
        "collegeEmail": college_email,
        "mobile": str(payload["mobile"]).strip(),
        "gender": payload["gender"],
        "courseStream": payload["courseStream"],
        "cgpa": cgpa,
        "sapCertification": payload["sapCertification"],
        "collegeName": payload["collegeName"],
        "status": "pending",
        "createdAt": now,
    }
    db.student_registrations.insert_one(reg_doc)

    # 2. Also insert into users so the person can log in immediately
    user_doc = {
        "name": student_name,
        "email": email,
        "userId": nax_unid,           # userId == naxUnid — single source of truth
        "naxUnid": nax_unid,
        "password": default_password,
        "role": "answerer",
        "createdAt": now,
        "lastLoginAt": None,
        "isActive": True,
        # Student profile fields
        "studentId": student_id,
        "collegeRollNumber": student_id,   # roll number = studentId
        "mobile": str(payload["mobile"]).strip(),
        "gender": payload["gender"],
        "courseStream": payload["courseStream"],
        "cgpa": cgpa,
        "sapCertification": payload["sapCertification"],
        "collegeName": payload["collegeName"],
        "collegeEmail": college_email,
    }
    db.users.insert_one(user_doc)

    return jsonify({"naxUnid": nax_unid, "message": "Registration successful"}), 201