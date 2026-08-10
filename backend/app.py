import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from config.settings import settings
from routes.auth_routes import auth_bp
from routes.admin_users import admin_users_bp
from routes.admin_exams import admin_exams_bp
from routes.admin_dashboard import admin_dashboard_bp
from routes.admin_results import admin_results_bp
from routes.admin_courses import admin_courses_bp
from routes.admin_interview_prep import admin_interview_prep_bp
from routes.answerer import answerer_bp
from routes.master_data import master_data_bp, public_bp
from routes.offer_letter import offer_letter_bp


def create_app() -> Flask:
    app = Flask(__name__)

    # Ensure uploads directories exist
    uploads_dir = os.path.join(app.root_path, "uploads")
    docs_dir = os.path.join(uploads_dir, "documents")
    os.makedirs(docs_dir, exist_ok=True)

    # CORS (comma-separated)
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=True)

    @app.get("/")
    def health():
        return jsonify({"status": "ok", "service": "exam-portal-backend"})

    @app.get("/uploads/<path:filename>")
    def serve_uploads(filename):
        return send_from_directory(uploads_dir, filename)

    # Blueprints
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(admin_users_bp, url_prefix="/admin/users")
    app.register_blueprint(admin_exams_bp, url_prefix="/admin/exams")
    app.register_blueprint(admin_dashboard_bp, url_prefix="/admin")
    app.register_blueprint(admin_results_bp, url_prefix="/admin/results")
    app.register_blueprint(admin_courses_bp, url_prefix="/admin/courses")
    app.register_blueprint(admin_interview_prep_bp, url_prefix="/admin/interview-prep")
    app.register_blueprint(answerer_bp, url_prefix="/answerer")
    app.register_blueprint(master_data_bp, url_prefix="/admin/master-data")
    app.register_blueprint(public_bp,      url_prefix="/public")
    app.register_blueprint(offer_letter_bp, url_prefix="/admin/offer-letter")

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        # Avoid leaking stack traces in JSON
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

    return app

app = create_app()

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=settings.PORT, debug=True)
