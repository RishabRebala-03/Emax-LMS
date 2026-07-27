from app import create_app


def test_health_endpoint():
    app = create_app()
    app.config.update(TESTING=True)

    response = app.test_client().get("/")

    assert response.status_code == 200
    assert response.get_json() == {
        "status": "ok",
        "service": "exam-portal-backend",
    }


def test_unknown_endpoint_returns_json_404():
    app = create_app()
    app.config.update(TESTING=True)

    response = app.test_client().get("/does-not-exist")

    assert response.status_code == 404
    assert response.get_json() == {"error": "Not found"}

