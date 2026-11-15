
import os
import json
import re
import sqlite3
import urllib.request
import urllib.error

from pathlib import Path
from contextlib import contextmanager
from datetime import date
from functools import wraps

from flask import (
    Flask, render_template, request, jsonify,
    redirect, url_for, session, flash
)
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

if not app.config["SECRET_KEY"]:
    raise RuntimeError("Set a strong SECRET_KEY in your .env file.")

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "0") == "1",
    PERMANENT_SESSION_LIFETIME=60 * 60 * 24 * 7
)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
DATABASE = Path(__file__).resolve().parent / "mindcare.db"

MOOD_LABELS = {
    1: "Very Low",
    2: "Low",
    3: "Okay",
    4: "Good",
    5: "Great"
}


@contextmanager
def get_db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS mood_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
                mood_label TEXT NOT NULL,
                note TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS journal_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT 'My journal',
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Safe migration: old records remain unassigned.
        migrations = {
            "chats": [("user_id", "INTEGER REFERENCES users(id)")],
            "mood_entries": [("user_id", "INTEGER REFERENCES users(id)")],
            "journal_entries": [("user_id", "INTEGER REFERENCES users(id)")],
            "mood_entries_extra": []
        }

        for table, columns_to_add in migrations.items():
            if table == "mood_entries_extra":
                continue

            existing = {
                row["name"]
                for row in conn.execute(f"PRAGMA table_info({table})")
            }

            for column, definition in columns_to_add:
                if column not in existing:
                    conn.execute(
                        f"ALTER TABLE {table} ADD COLUMN {column} {definition}"
                    )

        mood_columns = {
            row["name"]
            for row in conn.execute("PRAGMA table_info(mood_entries)")
        }

        if "entry_date" not in mood_columns:
            conn.execute("ALTER TABLE mood_entries ADD COLUMN entry_date TEXT")

        conn.execute("""
            UPDATE mood_entries
            SET entry_date = date(created_at)
            WHERE entry_date IS NULL
        """)

        conn.execute("CREATE INDEX IF NOT EXISTS idx_chats_user ON chats(user_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_moods_user ON mood_entries(user_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_moods_entry_date ON mood_entries(entry_date)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_journal_created ON journal_entries(created_at)")


init_db()


def login_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/") or request.path == "/chat":
                return jsonify({"error": "Please log in first."}), 401
            return redirect(url_for("login"))

        return function(*args, **kwargs)

    return wrapper


def current_user_id():
    return session.get("user_id")


# ---------------- AUTHENTICATION ----------------


@app.route("/")
def home():
    if "user_id" not in session:
        return redirect(url_for("login"))

    return render_template("index.html")

@app.route("/about")
@login_required
def about_page():
    return render_template("about.html")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if "user_id" in session:
        return redirect(url_for("home"))

    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        confirm = request.form.get("confirm_password") or ""

        if len(name) < 2 or len(name) > 60:
            flash("Name must be between 2 and 60 characters.", "error")
            return render_template("signup.html")

        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            flash("Please enter a valid email address.", "error")
            return render_template("signup.html")

        if len(password) < 8:
            flash("Password must contain at least 8 characters.", "error")
            return render_template("signup.html")

        if password != confirm:
            flash("Passwords do not match.", "error")
            return render_template("signup.html")

        try:
            with get_db() as conn:
                cursor = conn.execute("""
                    INSERT INTO users (name, email, password_hash)
                    VALUES (?, ?, ?)
                """, (
                    name,
                    email,
                    generate_password_hash(password)
                ))

                new_user_id = cursor.lastrowid

            session.clear()
            session.permanent = True
            session["user_id"] = new_user_id
            session["user_name"] = name

            return redirect(url_for("home"))

        except sqlite3.IntegrityError:
            flash("An account with this email already exists.", "error")

    return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect(url_for("home"))

    if request.method == "POST":
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""

        with get_db() as conn:
            user = conn.execute("""
                SELECT id, name, email, password_hash
                FROM users
                WHERE email = ?
            """, (email,)).fetchone()

        if user and check_password_hash(user["password_hash"], password):
            session.clear()
            session.permanent = True
            session["user_id"] = user["id"]
            session["user_name"] = user["name"]

            return redirect(url_for("home"))

        flash("Incorrect email or password.", "error")

    return render_template("login.html")


@app.route("/logout", methods=["POST"])
@login_required
def logout():
    session.clear()
    return redirect(url_for("login"))


# ---------------- CHAT APIs ----------------

@app.route("/api/chats", methods=["POST"])
@login_required
def create_chat():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "New Chat").strip()[:80] or "New Chat"

    with get_db() as conn:
        cursor = conn.execute("""
            INSERT INTO chats (title, user_id)
            VALUES (?, ?)
        """, (title, current_user_id()))

        chat_id = cursor.lastrowid

    return jsonify({
        "success": True,
        "chat_id": chat_id,
        "title": title
    }), 201


@app.route("/api/chats", methods=["GET"])
@login_required
def get_chats():
    with get_db() as conn:
        chats = conn.execute("""
            SELECT chats.id, chats.title, chats.created_at,
            COUNT(messages.id) AS message_count
            FROM chats
            LEFT JOIN messages ON chats.id = messages.chat_id
            WHERE chats.user_id = ?
            GROUP BY chats.id
            ORDER BY chats.id DESC
        """, (current_user_id(),)).fetchall()

    return jsonify({"chats": [dict(row) for row in chats]})


@app.route("/api/chats/<int:chat_id>/messages", methods=["GET"])
@login_required
def get_chat_messages(chat_id):
    with get_db() as conn:
        exists = conn.execute("""
            SELECT id FROM chats
            WHERE id = ? AND user_id = ?
        """, (chat_id, current_user_id())).fetchone()

        if not exists:
            return jsonify({"error": "Chat not found."}), 404

        rows = conn.execute("""
            SELECT id, role, content, created_at
            FROM messages
            WHERE chat_id = ?
            ORDER BY id
        """, (chat_id,)).fetchall()

    return jsonify({"messages": [dict(row) for row in rows]})


@app.route("/api/chats/<int:chat_id>", methods=["DELETE"])
@login_required
def delete_chat(chat_id):
    with get_db() as conn:
        cursor = conn.execute("""
            DELETE FROM chats
            WHERE id = ? AND user_id = ?
        """, (chat_id, current_user_id()))

        if cursor.rowcount == 0:
            return jsonify({"error": "Chat not found."}), 404

    return jsonify({"success": True})


# ---------------- AI CHAT ----------------

@app.route("/chat", methods=["POST"])
@login_required
def chat():
    data = request.get_json(silent=True) or {}

    message = (data.get("message") or "").strip()
    chat_id = data.get("chat_id")
    language = data.get("language", "en")

    if language not in ("en", "hi"):
        language = "en"

    if not message:
        return jsonify({"reply": "Please type a message."}), 400

    user_id = current_user_id()

    if chat_id is None:
        with get_db() as conn:
            cursor = conn.execute("""
                INSERT INTO chats (title, user_id)
                VALUES ('New Chat', ?)
            """, (user_id,))
            chat_id = cursor.lastrowid
    else:
        try:
            chat_id = int(chat_id)
        except (ValueError, TypeError):
            return jsonify({"reply": "Invalid conversation ID."}), 400

    with get_db() as conn:
        exists = conn.execute("""
            SELECT id FROM chats
            WHERE id = ? AND user_id = ?
        """, (chat_id, user_id)).fetchone()

        if not exists:
            return jsonify({"reply": "Conversation not found."}), 404

        previous = conn.execute("""
            SELECT role, content
            FROM messages
            WHERE chat_id = ?
            ORDER BY id DESC
            LIMIT 20
        """, (chat_id,)).fetchall()

    previous = list(reversed(previous))

    language_instruction = (
        "Reply in Hindi (Devanagari script), unless the user explicitly asks for English."
        if language == "hi"
        else "Reply in English, unless the user explicitly writes in Hindi or asks for Hindi."
    )

    system_prompt = (
        "You are MindCare AI, a supportive mental-wellness companion for reflection and general wellbeing. "
        "Be warm, respectful, non-judgmental, and concise. "
        "You are not a doctor or therapist: do not diagnose, prescribe, or claim to provide treatment. "
        "Do not present a mood score as a diagnosis. Encourage qualified professional support when appropriate. "
        "If the user may be in immediate danger or may hurt themselves or someone else, respond calmly, "
        "encourage them to contact local emergency services and a trusted person now. "
        + language_instruction
    )

    conversation = [{"role": "system", "content": system_prompt}]
    conversation.extend(
        {"role": row["role"], "content": row["content"]}
        for row in previous
    )
    conversation.append({"role": "user", "content": message})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": conversation,
        "stream": False
    }

    try:
        req = urllib.request.Request(
            OLLAMA_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=180) as response:
            result = json.loads(response.read().decode("utf-8"))

        reply = (
            result.get("message", {}).get("content", "").strip()
            or "I'm here to listen. Tell me more."
        )

    except urllib.error.URLError:
        return jsonify({
            "reply": "I cannot connect to Ollama. Please make sure Ollama is running."
        }), 503

    except Exception:
        app.logger.exception("Chat request failed")
        return jsonify({"reply": "Something went wrong. Please try again."}), 500

    with get_db() as conn:
        conn.execute("""
            INSERT INTO messages (chat_id, role, content)
            VALUES (?, 'user', ?)
        """, (chat_id, message))

        conn.execute("""
            INSERT INTO messages (chat_id, role, content)
            VALUES (?, 'assistant', ?)
        """, (chat_id, reply))

        conn.execute("""
            UPDATE chats
            SET title = ?
            WHERE id = ? AND user_id = ? AND title = 'New Chat'
        """, (message[:45], chat_id, user_id))

    return jsonify({"reply": reply, "chat_id": chat_id})


# ---------------- MOOD APIs ----------------

@app.route("/api/moods", methods=["POST"])
@login_required
def save_mood():
    data = request.get_json(silent=True) or {}

    score = data.get("mood_score")
    note = (data.get("note") or "").strip()
    entry_date = (data.get("entry_date") or date.today().isoformat()).strip()

    if isinstance(score, bool) or not isinstance(score, int) or score not in MOOD_LABELS:
        return jsonify({"error": "Please select a mood from 1 to 5."}), 400

    if len(note) > 1000:
        return jsonify({"error": "Your note must be 1000 characters or fewer."}), 400

    try:
        date.fromisoformat(entry_date)
    except ValueError:
        return jsonify({"error": "Invalid mood date."}), 400

    with get_db() as conn:
        cursor = conn.execute("""
            INSERT INTO mood_entries
            (mood_score, mood_label, note, entry_date, user_id)
            VALUES (?, ?, ?, ?, ?)
        """, (score, MOOD_LABELS[score], note, entry_date, current_user_id()))

    return jsonify({
        "success": True,
        "mood_id": cursor.lastrowid,
        "mood_score": score,
        "mood_label": MOOD_LABELS[score]
    }), 201


@app.route("/api/moods", methods=["GET"])
@login_required
def get_moods():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, mood_score, mood_label, note, created_at,
            COALESCE(entry_date, date(created_at)) AS entry_date
            FROM mood_entries
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 1000
        """, (current_user_id(),)).fetchall()

    return jsonify({"moods": [dict(row) for row in rows]})


@app.route("/api/moods/analytics", methods=["GET"])
@login_required
def mood_analytics():
    try:
        year = int(request.args.get("year", date.today().year))
        month = int(request.args.get("month", date.today().month))

        if month < 1 or month > 12 or year < 2000 or year > 2100:
            raise ValueError
    except ValueError:
        return jsonify({"error": "Invalid month or year."}), 400

    start = date(year, month, 1)
    end = date(year + (month == 12), 1 if month == 12 else month + 1, 1)
    prev_start = date(year - (month == 1), 12 if month == 1 else month - 1, 1)

    with get_db() as conn:
        current = conn.execute("""
            SELECT mood_score, mood_label, entry_date, note, created_at
            FROM mood_entries
            WHERE user_id = ? AND entry_date >= ? AND entry_date < ?
            ORDER BY entry_date
        """, (current_user_id(), start.isoformat(), end.isoformat())).fetchall()

        previous = conn.execute("""
            SELECT mood_score
            FROM mood_entries
            WHERE user_id = ? AND entry_date >= ? AND entry_date < ?
        """, (current_user_id(), prev_start.isoformat(), start.isoformat())).fetchall()

    scores = [row["mood_score"] for row in current]
    prev_scores = [row["mood_score"] for row in previous]

    counts = {str(score): scores.count(score) for score in range(1, 6)}
    average = round(sum(scores) / len(scores), 2) if scores else None
    previous_average = round(sum(prev_scores) / len(prev_scores), 2) if prev_scores else None
    most_common = max(range(1, 6), key=lambda score: counts[str(score)]) if scores else None

    return jsonify({
        "year": year,
        "month": month,
        "count": len(scores),
        "average": average,
        "previous_average": previous_average,
        "most_common_score": most_common,
        "distribution": counts,
        "entries": [dict(row) for row in current]
    })


# ---------------- JOURNAL APIs ----------------

@app.route("/api/journal", methods=["GET", "POST"])
@login_required
def journal():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}

        title = (data.get("title") or "My journal").strip()[:100] or "My journal"
        content = (data.get("content") or "").strip()

        if not content:
            return jsonify({"error": "Write something before saving."}), 400

        if len(content) > 10000:
            return jsonify({"error": "Journal entries must be 10,000 characters or fewer."}), 400

        with get_db() as conn:
            cursor = conn.execute("""
                INSERT INTO journal_entries (title, content, user_id)
                VALUES (?, ?, ?)
            """, (title, content, current_user_id()))

            entry_id = cursor.lastrowid

        return jsonify({"success": True, "entry_id": entry_id}), 201

    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, title, content, created_at, updated_at
            FROM journal_entries
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 200
        """, (current_user_id(),)).fetchall()

    return jsonify({"entries": [dict(row) for row in rows]})


@app.route("/api/journal/<int:entry_id>", methods=["DELETE"])
@login_required
def delete_journal_entry(entry_id):
    with get_db() as conn:
        cursor = conn.execute("""
            DELETE FROM journal_entries
            WHERE id = ? AND user_id = ?
        """, (entry_id, current_user_id()))

        if cursor.rowcount == 0:
            return jsonify({"error": "Journal entry not found."}), 404

    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=os.getenv("FLASK_DEBUG", "0") == "1"
    )
