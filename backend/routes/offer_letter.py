import os
import re
import shutil
import zipfile
import tempfile
import subprocess
from datetime import datetime

from flask import Blueprint, jsonify, send_file
from bson import ObjectId

from config.db import get_db


offer_letter_bp = Blueprint("offer_letter", __name__)

TEMPLATE_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "templates",
    "offer_letter_template.docx"
)


def _patch_footer(xml: str) -> str:
    """
    Reduce footer font sizes and adjust positioning
    so footer content does not get clipped.
    """

    # Reduce font size
    xml = xml.replace(
        'w:sz w:val="22"',
        'w:sz w:val="18"'
    )

    # Increase left textbox height
    xml = xml.replace(
        'cx="3143250" cy="565785"',
        'cx="3143250" cy="650000"'
    )

    # Move left textbox slightly upward
    xml = xml.replace(
        '<wp:posOffset>9846688</wp:posOffset>',
        '<wp:posOffset>9780000</wp:posOffset>'
    )

    # Move right textbox slightly upward
    xml = xml.replace(
        '<wp:posOffset>9971961</wp:posOffset>',
        '<wp:posOffset>9790000</wp:posOffset>'
    )

    return xml


def _generate_offer_letter(
    user_name: str,
    nax_unid: str,
    college_name: str
) -> tuple:

    tmp_dir = tempfile.mkdtemp(prefix="offer_")

    tmp_docx = os.path.join(tmp_dir, "offer_output.docx")

    shutil.copy2(TEMPLATE_PATH, tmp_docx)

    extract_dir = os.path.join(tmp_dir, "extracted")

    os.makedirs(extract_dir, exist_ok=True)

    # Extract DOCX
    with zipfile.ZipFile(tmp_docx, "r") as z:
        z.extractall(extract_dir)

    # =========================================================
    # PATCH document.xml
    # =========================================================

    doc_xml_path = os.path.join(
        extract_dir,
        "word",
        "document.xml"
    )

    with open(doc_xml_path, "r", encoding="utf-8") as f:
        xml = f.read()

    # =========================================================
    # 1. Replace DevCon ID
    # =========================================================

    xml = xml.replace(
        ">1500001<",
        f">{nax_unid}<"
    )

    # =========================================================
    # 2. Replace Date
    # =========================================================

    current_date = datetime.now().strftime("%d-%b-%Y")

    xml = xml.replace(
        ">21-Jan-2026<",
        f">{current_date}<"
    )

    # =========================================================
    # 3. Replace College Name Dynamically
    # =========================================================

    xml = xml.replace(
        ">Sri Vasavi Engineering College <",
        f">{college_name} <"
    )

    xml = xml.replace(
        ">Sri Vasavi Engineering College<",
        f">{college_name}<"
    )

    # =========================================================
    # 4. Replace Dear Line
    # =========================================================

    xml = xml.replace(
        ">Yerra<",
        f">{user_name},<",
        1
    )

    xml = xml.replace(
        ">Lalitha,<",
        "><",
        1
    )

    # =========================================================
    # 5. Replace Acceptance Line
    # =========================================================

    xml = xml.replace(
        ">Yerra<",
        f">{user_name}<",
        1
    )

    xml = xml.replace(
        ">Lalitha,<",
        "><",
        1
    )

    # Fix spacing issue
    xml = re.sub(
        r'(<w:t[^>]*>)\s{2,}(confirm)',
        r'\1 \2',
        xml
    )

    # =========================================================
    # 6. Remove Extra Blank Paragraph
    # =========================================================

    xml = re.sub(
        r'<w:p w14:paraId="0D0B940D".*?</w:p>',
        '',
        xml,
        flags=re.DOTALL
    )

    # =========================================================
    # 7. Fix Left Strip Gap
    # =========================================================

    xml = xml.replace(
        '<wp:posOffset>21699</wp:posOffset>',
        '<wp:posOffset>0</wp:posOffset>'
    )

    # Save updated XML
    with open(doc_xml_path, "w", encoding="utf-8") as f:
        f.write(xml)

    # =========================================================
    # PATCH footer1.xml
    # =========================================================

    footer_xml_path = os.path.join(
        extract_dir,
        "word",
        "footer1.xml"
    )

    if os.path.exists(footer_xml_path):

        with open(footer_xml_path, "r", encoding="utf-8") as f:
            footer_xml = f.read()

        footer_xml = _patch_footer(footer_xml)

        with open(footer_xml_path, "w", encoding="utf-8") as f:
            f.write(footer_xml)

    # =========================================================
    # REPACK DOCX
    # =========================================================

    final_docx_path = os.path.join(
        tmp_dir,
        "offer_final.docx"
    )

    with zipfile.ZipFile(
        final_docx_path,
        "w",
        zipfile.ZIP_DEFLATED
    ) as zout:

        for root, dirs, files in os.walk(extract_dir):

            for file in files:

                file_path = os.path.join(root, file)

                arcname = os.path.relpath(
                    file_path,
                    extract_dir
                )

                zout.write(file_path, arcname)

    # =========================================================
    # CONVERT DOCX TO PDF
    # =========================================================

    result = subprocess.run(
        [
            "/usr/bin/libreoffice",
            "--headless",
            "--convert-to",
            "pdf",
            "--outdir",
            tmp_dir,
            final_docx_path,
        ],
        capture_output=True,
        text=True,
        timeout=60,
        env={
            **os.environ,
            "HOME": tmp_dir
        },
    )

    pdf_path = os.path.join(
        tmp_dir,
        "offer_final.pdf"
    )

    if result.returncode != 0 or not os.path.exists(pdf_path):
        raise RuntimeError(
            f"PDF conversion failed: {result.stderr}"
        )

    return pdf_path, tmp_dir


@offer_letter_bp.route("/<user_id>", methods=["GET"])
def generate_offer_letter(user_id: str):

    db = get_db()

    try:
        user = db.users.find_one({
            "_id": ObjectId(user_id)
        })

    except Exception:

        user = db.users.find_one({
            "userId": user_id
        })

    if not user:
        return jsonify({
            "error": "User not found"
        }), 404

    # =========================================================
    # USER DETAILS
    # =========================================================

    name = user.get("name", "Associate")

    nax_unid = (
        user.get("naxUnid")
        or user.get("userId", "N/A")
    )

    # Dynamic college name
    college_name = (
        user.get("collegeName")
        or user.get("college")
        or "College"
    )

    # =========================================================
    # TEMPLATE CHECK
    # =========================================================

    if not os.path.exists(TEMPLATE_PATH):

        return jsonify({
            "error": "Offer letter template not found on server"
        }), 500

    try:

        output_path, tmp_dir = _generate_offer_letter(
            user_name=name,
            nax_unid=nax_unid,
            college_name=college_name
        )

        safe_name = re.sub(
            r"[^\w\s-]",
            "",
            name
        ).strip().replace(" ", "_")

        download_name = (
            f"{safe_name}_Devcon_Offer_Letter.pdf"
        )

        response = send_file(
            output_path,
            as_attachment=True,
            download_name=download_name,
            mimetype="application/pdf",
        )

        @response.call_on_close
        def cleanup():
            shutil.rmtree(tmp_dir, ignore_errors=True)

        return response

    except Exception as e:

        return jsonify({
            "error": f"Failed to generate offer letter: {str(e)}"
        }), 500