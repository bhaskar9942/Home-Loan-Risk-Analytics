"""Flask backend for the Home Loan Risk app.

Routes:
  GET  /                  - Home page
  GET  /risk-prediction   - prediction form page
  GET  /analytics         - analytics page
  GET  /dashboard         - Power BI dashboard page
  GET  /about             - about and how-to-use page
  GET  /dashboard.pdf     - the Power BI dashboard PDF
  GET  /health            - is the server running?
  GET  /options           - dropdown values read from the saved model
  POST /predict           - receives the form values as JSON and returns the estimate
"""
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from predict import (CATEGORY_VALUES, THRESHOLD, InputError, predict_applicant)

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
app = Flask(__name__, static_folder=str(FRONTEND), static_url_path="/static")


@app.route("/")
def home():
    return send_from_directory(FRONTEND, "index.html")


@app.route("/risk-prediction")
def risk_prediction_page():
    return send_from_directory(FRONTEND, "risk-prediction.html")


@app.route("/analytics")
def analytics_page():
    return send_from_directory(FRONTEND, "analytics.html")


@app.route("/dashboard")
def dashboard_page():
    return send_from_directory(FRONTEND, "dashboard.html")


@app.route("/about")
def about_page():
    return send_from_directory(FRONTEND, "about.html")


POWERBI = Path(__file__).resolve().parents[2] / "powerbi"


@app.route("/dashboard.pdf")
def dashboard():
    return send_from_directory(POWERBI, "home_loan_dashboard.pdf")


@app.route("/health")
def health():
    return jsonify({"status": "ok", "message": "Flask is working"})


@app.route("/options")
def options():
    return jsonify({
        "loan_type": CATEGORY_VALUES["NAME_CONTRACT_TYPE"],
        "education": CATEGORY_VALUES["NAME_EDUCATION_TYPE"],
        "threshold_pct": round(100 * THRESHOLD, 2),
    })


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"status": "error",
                        "errors": ["Send the form values as JSON."]}), 400
    try:
        result = predict_applicant(data)
    except InputError as error:
        return jsonify({"status": "error",
                        "errors": getattr(error, "errors", [str(error)])}), 400
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)