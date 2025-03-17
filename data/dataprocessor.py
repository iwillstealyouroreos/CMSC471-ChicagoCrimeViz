import pandas as pd
df = pd.read_csv("./data/Crimes_-_2001_to_Present_20250314.csv")
df = df[["Date", "Primary Type", "Arrest", "District"]]
df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
df = df[(df["Date"].dt.year >= 2018) & (df["Date"].dt.year <= 2022)]
df["Year"] = df["Date"].dt.year
df = df.drop(columns=["Date"])
df = df.dropna()
df["Arrest"] = df["Arrest"].astype(str)
df["Arrest"] = df["Arrest"].str.strip().str.lower() == "true"
df["District"] = pd.to_numeric(df["District"], errors="coerce")
df.to_csv("crimes_cleaned.csv", index=False)