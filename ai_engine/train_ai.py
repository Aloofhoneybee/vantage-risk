import json 
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os

# 1. GENERATE NUANCED DATA
np.random.seed(42)
data_size = 50000
income = np.random.randint(20000, 250000, data_size)
fico = np.random.randint(300, 850, data_size)
dti = np.random.uniform(5, 80, data_size)
loan_amnt = np.random.randint(1000, 50000, data_size)

# IMPROVED LOGIC: Default is a weighted probability, not a hard rule
# Income and FICO lower risk; DTI increases risk
risk_score = (850 - fico) * 0.05 + (dti * 0.2) - (income / 10000)
# Convert score to probability (0 to 1)
prob = 1 / (1 + np.exp(-(risk_score - 15)))
default = (np.random.rand(data_size) < prob).astype(int)

df = pd.DataFrame({'income': income, 'fico': fico, 'dti': dti, 'loan_amnt': loan_amnt, 'default': default})

# 2. FEATURE SCALING (Boosts Accuracy & fixes Convergence)
X = df.drop('default', axis=1)
y = df['default']
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2)

# 3. TRAIN
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# 4. SAVE EVERYTHING
joblib.dump(model, 'lending_model.pkl')
joblib.dump(scaler, 'scaler.pkl') # We need to save the scaler too!
print(f"Model Accuracy: {model.score(X_test, y_test):.2%}")

# ... (at the very bottom of your train_ai.py)



# ... (at the very bottom of your script)

# 5. GET ABSOLUTE PATH
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
data_folder = os.path.join(parent_dir, 'data')

# 6. CREATE AND SAVE
if not os.path.exists(data_folder):
    os.makedirs(data_folder)

csv_path = os.path.join(data_folder, 'lending_club_sample.csv')
metrics_path = os.path.join(data_folder, 'evaluation_metrics.txt')

df.to_csv(csv_path, index=False)
with open(metrics_path, 'w') as f:
    f.write(f"Accuracy: {model.score(X_test, y_test):.2%}")
    
from sklearn.metrics import precision_score, recall_score, f1_score, classification_report

# ... (keep your training code above)

# 7. CALCULATE COMPREHENSIVE METRICS
y_pred = model.predict(X_test)
accuracy = model.score(X_test, y_test)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

# 8. SAVE EVALUATION RESULTS (Now Rubric-Compliant)
metrics_path = os.path.join(data_folder, 'evaluation_metrics.txt')
with open(metrics_path, 'w') as f:
    f.write("VANTAGERISK AI: MODEL EVALUATION REPORT\n")
    f.write("=======================================\n")
    f.write(f"Algorithm: Logistic Regression (Scikit-Learn)\n")
    f.write(f"Training Dataset Size: 50,000 observations\n\n")
    f.write(f"Accuracy:  {accuracy:.2%}\n")
    f.write(f"Precision: {precision:.2%}\n")
    f.write(f"Recall:    {recall:.2%}\n")
    f.write(f"F1-Score:  {f1:.2f}\n\n")
    f.write("Full Classification Report:\n")
    f.write(classification_report(y_test, y_pred))
    
    # Add this at the top with other imports

# ... (rest of your training code)

# NEW: Save metrics in a format the Backend can read automatically
stats = {
    "accuracy": round(accuracy * 100, 2),
    "precision": round(precision * 100, 2),
    "recall": round(recall * 100, 2),
    "f1_score": round(f1, 2)
}

with open(os.path.join(data_folder, 'model_stats.json'), 'w') as f:
    json.dump(stats, f)
    
    # Ensure this is at the top of the file

# ... (rest of your training code)

# CALCULATE ALL RUBRIC METRICS
y_pred = model.predict(X_test)
accuracy = model.score(X_test, y_test)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)

# CREATE THE SYNC OBJECT
live_stats = {
    "accuracy": round(accuracy * 100, 2),
    "precision": round(precision * 100, 2),
    "recall": round(recall * 100, 2),
    "f1_score": round(f1, 2)
}

# SAVE TO DATA FOLDER
# This is the "Master File" the backend will look at
stats_path = os.path.join(data_folder, 'model_stats.json')
with open(stats_path, 'w') as f:
    json.dump(live_stats, f)

print(f"📊 LIVE SYNC COMPLETE: All metrics saved to {stats_path}")
print(live_stats)

print("SUCCESS: model_stats.json created for UI sync!")

print(f"Full metrics saved to: {metrics_path}")

print("--------------------------------------------------")
print(f"SUCCESS! YOUR FILES ARE LOCATED AT:")
print(csv_path)
print(metrics_path)
print("--------------------------------------------------")