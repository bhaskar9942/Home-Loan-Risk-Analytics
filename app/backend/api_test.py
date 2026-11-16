"""Tests the Flask routes without starting the server. Prints results; changes nothing."""
from app import app

client = app.test_client()
base = {"loan_type": "Cash loans", "education": "Secondary / secondary special",
        "income": 150000, "loan_amount": 500000, "annuity": 25000,
        "goods_price": 450000, "age_years": 35, "years_employed": 5}


def show(title, response):
    print(f"{title}: HTTP {response.status_code}")
    return response.get_json()


body = show("GET /health", client.get("/health"))
print("  ", body)

body = show("GET /options", client.get("/options"))
print("   loan types:", body["loan_type"])
print("   education:", body["education"])
print("   threshold %:", body["threshold_pct"])

all_three = dict(base, ext_source_1=0.2, ext_source_2=0.15, ext_source_3=0.2)
body = show("POST /predict (all three scores)", client.post("/predict", json=all_three))
print("  ", body["status"], body["probability_pct"], body["risk_level"],
      body["reliability"], body["warning"])

body = show("POST /predict (score 3 only)",
            client.post("/predict", json=dict(base, ext_source_3=0.2)))
print("  ", body["status"], body["probability_pct"], body["reliability"])

body = show("POST /predict (no scores)", client.post("/predict", json=base))
print("  ", body["status"], "|", body["message"][:55])

body = show("POST /predict (invalid values)",
            client.post("/predict", json=dict(base, age_years=5, education="PhD", income=-1)))
print("  ", body["status"], body["errors"])

body = show("POST /predict (not JSON)",
            client.post("/predict", data="hello", content_type="text/plain"))
print("  ", body)

body = show("POST /predict (JSON list, not an object)", client.post("/predict", json=[1, 2]))
print("  ", body)

print("GET /predict: HTTP", client.get("/predict").status_code)

print("\n=== Page routes ===")
expected = {
    "/": "text/html",
    "/risk-prediction": "text/html",
    "/analytics": "text/html",
    "/dashboard": "text/html",
    "/about": "text/html",
    "/dashboard.pdf": "application/pdf",
}
for path, kind in expected.items():
    response = client.get(path)
    ok = response.status_code == 200 and response.content_type.startswith(kind)
    print(f"GET {path}: HTTP {response.status_code} | {response.content_type} | "
          f"{'OK' if ok else 'CHECK'}")
    response.close()

page = client.get("/risk-prediction")
print("Form present on /risk-prediction:", b'id="applicant-form"' in page.data)
page.close()