import time
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from database import get_connection, init_db, row_to_dict

BASE_DIR = Path(__file__).parent

app = Flask(__name__, static_folder=str(BASE_DIR), static_url_path="")


def validate_record_payload(data):
    errors = []

    date = data.get("date", "")
    if not date or len(date) != 10:
        errors.append("日期格式无效")

    record_type = data.get("type", "")
    if record_type not in ("income", "expense"):
        errors.append("类型必须是 income 或 expense")

    category = (data.get("category") or "").strip()
    if not category:
        errors.append("分类不能为空")

    try:
        amount = float(data.get("amount", 0))
        if amount <= 0:
            errors.append("金额必须大于 0")
    except (TypeError, ValueError):
        errors.append("金额格式无效")

    if errors:
        return None, errors

    return {
        "date": date,
        "type": record_type,
        "category": category,
        "amount": amount,
        "note": (data.get("note") or "").strip(),
    }, None


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/api/records")
def list_records():
    record_type = request.args.get("type", "all")
    month = request.args.get("month", "").strip()

    query = "SELECT * FROM records WHERE 1=1"
    params = []

    if record_type in ("income", "expense"):
        query += " AND type = ?"
        params.append(record_type)

    if month:
        query += " AND date LIKE ?"
        params.append(f"{month}%")

    query += " ORDER BY date DESC, created_at DESC"

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()

    return jsonify([row_to_dict(row) for row in rows])


@app.get("/api/records/<record_id>")
def get_record(record_id):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM records WHERE id = ?", (record_id,)
        ).fetchone()

    if not row:
        return jsonify({"error": "记录不存在"}), 404

    return jsonify(row_to_dict(row))


@app.get("/api/summary")
def get_summary():
    with get_connection() as conn:
        income = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM records WHERE type = 'income'"
        ).fetchone()[0]
        expense = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM records WHERE type = 'expense'"
        ).fetchone()[0]

    return jsonify(
        {
            "totalIncome": income,
            "totalExpense": expense,
            "balance": income - expense,
        }
    )


@app.post("/api/records")
def create_record():
    payload, errors = validate_record_payload(request.get_json(silent=True) or {})
    if errors:
        return jsonify({"error": errors[0], "errors": errors}), 400

    record_id = str(uuid.uuid4())
    created_at = int(time.time() * 1000)

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO records (id, date, type, category, amount, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record_id,
                payload["date"],
                payload["type"],
                payload["category"],
                payload["amount"],
                payload["note"],
                created_at,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM records WHERE id = ?", (record_id,)
        ).fetchone()

    return jsonify(row_to_dict(row)), 201


@app.put("/api/records/<record_id>")
def update_record(record_id):
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT * FROM records WHERE id = ?", (record_id,)
        ).fetchone()

    if not existing:
        return jsonify({"error": "记录不存在"}), 404

    payload, errors = validate_record_payload(
        request.get_json(silent=True) or {}
    )
    if errors:
        return jsonify({"error": errors[0], "errors": errors}), 400

    with get_connection() as conn:
        conn.execute(
            """
            UPDATE records
            SET date = ?, type = ?, category = ?, amount = ?, note = ?
            WHERE id = ?
            """,
            (
                payload["date"],
                payload["type"],
                payload["category"],
                payload["amount"],
                payload["note"],
                record_id,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM records WHERE id = ?", (record_id,)
        ).fetchone()

    return jsonify(row_to_dict(row))


@app.delete("/api/records/<record_id>")
def delete_record(record_id):
    with get_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM records WHERE id = ?", (record_id,)
        ).fetchone()
        if not existing:
            return jsonify({"error": "记录不存在"}), 404

        conn.execute("DELETE FROM records WHERE id = ?", (record_id,))
        conn.commit()

    return jsonify({"ok": True})


if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=True)
