"""Checks the reliability rules in predict.py. Prints results; changes nothing."""
from predict import predict_applicant

base = {"loan_type": "Cash loans", "education": "Secondary / secondary special",
        "income": 150000, "loan_amount": 500000, "annuity": 25000,
        "goods_price": 450000, "age_years": 35, "years_employed": 5}
scores = {1: 0.2, 2: 0.15, 3: 0.2}

for entered in [(), (1,), (2,), (3,), (1, 2), (1, 3), (2, 3), (1, 2, 3)]:
    data = dict(base)
    for i in entered:
        data[f"ext_source_{i}"] = scores[i]
    r = predict_applicant(data)
    label = "+".join(map(str, entered)) or "none"
    if r["status"] != "ok":
        print(f"{label:8s} -> {r['status']} (no probability, no risk label)")
    else:
        print(f"{label:8s} -> {r['probability_pct']:6.2f}% | {r['risk_level']} | "
              f"reliability: {r['reliability']}")

print("\nWarning, score 3 only:\n", predict_applicant(dict(base, ext_source_3=0.2))["warning"])
print("\nWarning, scores 1 and 2:\n",
      predict_applicant(dict(base, ext_source_1=0.2, ext_source_2=0.15))["warning"])
print("\nWarning, all three:",
      predict_applicant(dict(base, ext_source_1=0.2, ext_source_2=0.15, ext_source_3=0.2))["warning"])
print("\nNo scores:\n", predict_applicant(base)["message"])