"""DaySync backend API tests - covers auth, categories, schedule, notes, events, quicknotes, and data isolation."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://daysync-app.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _no_mongo_id(obj):
    """Recursively assert that no '_id' key is present in any dict."""
    if isinstance(obj, dict):
        assert "_id" not in obj, f"Mongo _id leaked in response: {obj}"
        for v in obj.values():
            _no_mongo_id(v)
    elif isinstance(obj, list):
        for v in obj:
            _no_mongo_id(v)


# -------- shared fixtures --------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def primary_user(session):
    """Login to existing seeded user, or register if missing."""
    creds = {"email": "test@daysync.it", "password": "testpass123"}
    r = session.post(f"{API}/auth/login", json=creds)
    if r.status_code != 200:
        # try register
        r = session.post(f"{API}/auth/register", json={**creds, "name": "Test User"})
    assert r.status_code == 200, f"Auth setup failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["token"], "user": data["user"]}


@pytest.fixture(scope="module")
def secondary_user(session):
    """Register a fresh user for isolation testing."""
    email = f"TEST_iso_{uuid.uuid4().hex[:8]}@daysync.it"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": "Pass12345!", "name": "Iso User"})
    assert r.status_code == 200, f"Secondary register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["token"], "user": data["user"], "email": email}


# -------- Health --------
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert "message" in r.json()


# -------- Auth --------
class TestAuth:
    def test_register_new_user_seeds_4_default_categories(self, session):
        email = f"TEST_reg_{uuid.uuid4().hex[:8]}@daysync.it"
        r = session.post(f"{API}/auth/register", json={"email": email, "password": "Pass12345!"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and "user" in body
        assert body["user"]["email"] == email.lower()
        assert "id" in body["user"]
        _no_mongo_id(body)

        # Verify 4 default categories seeded
        r2 = session.get(f"{API}/categories", headers=_auth_headers(body["token"]))
        assert r2.status_code == 200
        cats = r2.json()
        names = sorted([c["name"] for c in cats])
        assert names == ["Lavoro", "Personale", "Studio", "Urgente"], f"Got: {names}"
        _no_mongo_id(cats)

    def test_register_duplicate_email_rejected(self, session, primary_user):
        r = session.post(f"{API}/auth/register", json={"email": "test@daysync.it", "password": "x"})
        assert r.status_code == 400

    def test_login_returns_jwt(self, session, primary_user):
        r = session.post(f"{API}/auth/login", json={"email": "test@daysync.it", "password": "testpass123"})
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body.get("token"), str) and len(body["token"]) > 20
        assert body["token"].count(".") == 2  # JWT has 3 parts
        _no_mongo_id(body)

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": "test@daysync.it", "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_bearer(self, session, primary_user):
        r = session.get(f"{API}/auth/me", headers=_auth_headers(primary_user["token"]))
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == "test@daysync.it"
        assert "password_hash" not in body
        _no_mongo_id(body)

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, session):
        r = session.get(f"{API}/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
        assert r.status_code == 401


# -------- Categories --------
class TestCategories:
    def test_create_list_delete_category(self, session, primary_user):
        h = _auth_headers(primary_user["token"])
        payload = {"name": f"TEST_cat_{uuid.uuid4().hex[:6]}", "color": "#abcdef"}
        r = session.post(f"{API}/categories", json=payload, headers=h)
        assert r.status_code == 200, r.text
        cat = r.json()
        assert cat["name"] == payload["name"]
        assert cat["color"] == payload["color"]
        assert "id" in cat
        _no_mongo_id(cat)

        # GET to verify persistence
        r2 = session.get(f"{API}/categories", headers=h)
        assert r2.status_code == 200
        ids = [c["id"] for c in r2.json()]
        assert cat["id"] in ids
        _no_mongo_id(r2.json())

        # Delete
        r3 = session.delete(f"{API}/categories/{cat['id']}", headers=h)
        assert r3.status_code == 200
        # Verify gone
        r4 = session.get(f"{API}/categories", headers=h)
        ids = [c["id"] for c in r4.json()]
        assert cat["id"] not in ids


# -------- Schedule --------
class TestSchedule:
    def test_schedule_crud(self, session, primary_user):
        h = _auth_headers(primary_user["token"])
        payload = {"title": "TEST_lecture", "day_of_week": 1, "start_time": "09:00", "end_time": "10:30", "color": "#3b82f6"}
        r = session.post(f"{API}/schedule", json=payload, headers=h)
        assert r.status_code == 200, r.text
        item = r.json()
        assert item["title"] == payload["title"]
        assert item["day_of_week"] == 1
        _no_mongo_id(item)

        # list
        r2 = session.get(f"{API}/schedule", headers=h)
        assert r2.status_code == 200
        assert any(x["id"] == item["id"] for x in r2.json())

        # update
        upd = {**payload, "title": "TEST_lecture_updated", "end_time": "11:00"}
        r3 = session.put(f"{API}/schedule/{item['id']}", json=upd, headers=h)
        assert r3.status_code == 200
        assert r3.json()["title"] == "TEST_lecture_updated"
        assert r3.json()["end_time"] == "11:00"

        # GET to verify update persisted
        r3b = session.get(f"{API}/schedule", headers=h)
        found = next((x for x in r3b.json() if x["id"] == item["id"]), None)
        assert found and found["title"] == "TEST_lecture_updated"

        # delete
        r4 = session.delete(f"{API}/schedule/{item['id']}", headers=h)
        assert r4.status_code == 200
        r5 = session.get(f"{API}/schedule", headers=h)
        assert not any(x["id"] == item["id"] for x in r5.json())

    def test_update_nonexistent_schedule(self, session, primary_user):
        h = _auth_headers(primary_user["token"])
        r = session.put(f"{API}/schedule/{uuid.uuid4()}",
                        json={"title": "x", "day_of_week": 0, "start_time": "00:00", "end_time": "01:00"}, headers=h)
        assert r.status_code == 404


# -------- Notes --------
class TestNotes:
    def test_notes_crud(self, session, primary_user):
        h = _auth_headers(primary_user["token"])
        r = session.post(f"{API}/notes", json={"title": "TEST_note", "content": "ciao"}, headers=h)
        assert r.status_code == 200, r.text
        n = r.json()
        assert n["title"] == "TEST_note" and n["content"] == "ciao"
        _no_mongo_id(n)

        r2 = session.get(f"{API}/notes", headers=h)
        assert r2.status_code == 200
        assert any(x["id"] == n["id"] for x in r2.json())

        r3 = session.put(f"{API}/notes/{n['id']}", json={"title": "TEST_note2", "content": "aggiornato"}, headers=h)
        assert r3.status_code == 200
        assert r3.json()["title"] == "TEST_note2"
        assert r3.json()["content"] == "aggiornato"
        # updated_at should change
        assert r3.json()["updated_at"] >= n["updated_at"]

        r4 = session.delete(f"{API}/notes/{n['id']}", headers=h)
        assert r4.status_code == 200
        r5 = session.get(f"{API}/notes", headers=h)
        assert not any(x["id"] == n["id"] for x in r5.json())


# -------- Events --------
class TestEvents:
    def test_event_crud_and_complete_toggle(self, session, primary_user):
        h = _auth_headers(primary_user["token"])
        r = session.post(f"{API}/events", json={"title": "TEST_evt", "date": "2026-02-01", "time": "10:00"}, headers=h)
        assert r.status_code == 200, r.text
        ev = r.json()
        assert ev["completed"] is False
        _no_mongo_id(ev)

        # toggle complete -> True
        r2 = session.patch(f"{API}/events/{ev['id']}/complete", headers=h)
        assert r2.status_code == 200
        assert r2.json()["completed"] is True

        # GET to verify persisted
        lst = session.get(f"{API}/events", headers=h).json()
        found = next((x for x in lst if x["id"] == ev["id"]), None)
        assert found and found["completed"] is True

        # toggle back -> False
        r3 = session.patch(f"{API}/events/{ev['id']}/complete", headers=h)
        assert r3.status_code == 200
        assert r3.json()["completed"] is False

        # update
        r4 = session.put(f"{API}/events/{ev['id']}",
                         json={"title": "TEST_evt2", "date": "2026-02-02"}, headers=h)
        assert r4.status_code == 200
        assert r4.json()["title"] == "TEST_evt2"
        assert r4.json()["date"] == "2026-02-02"

        # delete
        r5 = session.delete(f"{API}/events/{ev['id']}", headers=h)
        assert r5.status_code == 200

    def test_complete_nonexistent_event(self, session, primary_user):
        h = _auth_headers(primary_user["token"])
        r = session.patch(f"{API}/events/{uuid.uuid4()}/complete", headers=h)
        assert r.status_code == 404


# -------- Quick Notes --------
class TestQuickNotes:
    def test_quicknote_crud(self, session, primary_user):
        h = _auth_headers(primary_user["token"])
        r = session.post(f"{API}/quicknotes", json={"text": "TEST_qn", "color": "#ff0000"}, headers=h)
        assert r.status_code == 200, r.text
        qn = r.json()
        assert qn["text"] == "TEST_qn" and qn["color"] == "#ff0000"
        _no_mongo_id(qn)

        r2 = session.get(f"{API}/quicknotes", headers=h)
        assert r2.status_code == 200
        assert any(x["id"] == qn["id"] for x in r2.json())

        r3 = session.delete(f"{API}/quicknotes/{qn['id']}", headers=h)
        assert r3.status_code == 200
        r4 = session.get(f"{API}/quicknotes", headers=h)
        assert not any(x["id"] == qn["id"] for x in r4.json())

    def test_quicknote_default_color(self, session, primary_user):
        h = _auth_headers(primary_user["token"])
        r = session.post(f"{API}/quicknotes", json={"text": "TEST_qn_def"}, headers=h)
        assert r.status_code == 200
        qn = r.json()
        assert qn["color"] == "#3f3f46"
        # cleanup
        session.delete(f"{API}/quicknotes/{qn['id']}", headers=h)


# -------- Data Isolation --------
class TestIsolation:
    def test_user_a_cannot_see_user_b_data(self, session, primary_user, secondary_user):
        ha = _auth_headers(primary_user["token"])
        hb = _auth_headers(secondary_user["token"])

        # User A creates a note
        r = session.post(f"{API}/notes", json={"title": "TEST_isoA", "content": "secret A"}, headers=ha)
        assert r.status_code == 200
        note_a_id = r.json()["id"]

        # User B lists notes -> must NOT contain user A's note
        rb = session.get(f"{API}/notes", headers=hb)
        assert rb.status_code == 200
        ids = [n["id"] for n in rb.json()]
        assert note_a_id not in ids

        # User B tries to update User A's note -> 404
        ru = session.put(f"{API}/notes/{note_a_id}",
                         json={"title": "hacked", "content": "x"}, headers=hb)
        assert ru.status_code == 404

        # User B tries to delete User A's note -> "ok" but A's note still there
        rd = session.delete(f"{API}/notes/{note_a_id}", headers=hb)
        assert rd.status_code == 200
        ra = session.get(f"{API}/notes", headers=ha)
        assert any(n["id"] == note_a_id for n in ra.json()), "User B was able to delete User A's note!"

        # cleanup
        session.delete(f"{API}/notes/{note_a_id}", headers=ha)

    def test_categories_isolated(self, session, primary_user, secondary_user):
        ha = _auth_headers(primary_user["token"])
        hb = _auth_headers(secondary_user["token"])
        # secondary user must have only their own 4 default cats
        r = session.get(f"{API}/categories", headers=hb)
        assert r.status_code == 200
        cats_b = r.json()
        # all should belong to user B
        assert all(c.get("user_id") == secondary_user["user"]["id"] for c in cats_b)


# -------- No Mongo _id leakage (sweep) --------
class TestNoMongoIdLeakage:
    def test_all_list_endpoints_no_id(self, session, primary_user):
        h = _auth_headers(primary_user["token"])
        for path in ["/categories", "/schedule", "/notes", "/events", "/quicknotes"]:
            r = session.get(f"{API}{path}", headers=h)
            assert r.status_code == 200, f"{path} -> {r.status_code}"
            _no_mongo_id(r.json())
