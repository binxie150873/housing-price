"""
Generates a realistic synthetic housing dataset (545 rows, 13 columns)
matching the standard Housing Price dataset schema.
Saved to data/housing.csv.
"""
import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)
N = 545

# --- Numerical features ---
area = np.random.randint(1650, 16200, size=N)
bedrooms = np.random.choice([1, 2, 3, 4, 5, 6], size=N, p=[0.05, 0.15, 0.40, 0.25, 0.10, 0.05])
bathrooms = np.random.choice([1, 2, 3, 4], size=N, p=[0.35, 0.45, 0.15, 0.05])
stories = np.random.choice([1, 2, 3, 4], size=N, p=[0.30, 0.45, 0.18, 0.07])
parking = np.random.choice([0, 1, 2, 3], size=N, p=[0.25, 0.45, 0.22, 0.08])

# --- Categorical features (yes/no) ---
def yn(p_yes):
    return np.where(np.random.rand(N) < p_yes, "yes", "no")

mainroad        = yn(0.82)
guestroom       = yn(0.28)
basement        = yn(0.40)
hotwaterheating = yn(0.10)
airconditioning = yn(0.32)
prefarea        = yn(0.23)

furnishingstatus = np.random.choice(
    ["furnished", "semi-furnished", "unfurnished"],
    size=N,
    p=[0.35, 0.40, 0.25],
)

# --- Price generation (realistic correlations) ---
base_price = 2_000_000

price = (
    base_price
    + area * 800
    + bedrooms * 150_000
    + bathrooms * 250_000
    + stories * 200_000
    + parking * 100_000
    + (mainroad == "yes") * 400_000
    + (guestroom == "yes") * 150_000
    + (basement == "yes") * 200_000
    + (hotwaterheating == "yes") * 100_000
    + (airconditioning == "yes") * 300_000
    + (prefarea == "yes") * 500_000
    + (furnishingstatus == "furnished") * 300_000
    + (furnishingstatus == "semi-furnished") * 150_000
    + np.random.normal(0, 500_000, size=N)  # noise
).astype(int)

# Clip to realistic range
price = np.clip(price, 1_750_000, 13_300_000)

df = pd.DataFrame({
    "price":            price,
    "area":             area,
    "bedrooms":         bedrooms,
    "bathrooms":        bathrooms,
    "stories":          stories,
    "mainroad":         mainroad,
    "guestroom":        guestroom,
    "basement":         basement,
    "hotwaterheating":  hotwaterheating,
    "airconditioning":  airconditioning,
    "parking":          parking,
    "prefarea":         prefarea,
    "furnishingstatus": furnishingstatus,
})

out_path = Path(__file__).parent.parent / "data" / "housing.csv"
out_path.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(out_path, index=False)
print(f"Dataset saved to {out_path}  shape={df.shape}")
