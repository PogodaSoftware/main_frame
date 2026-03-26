FROM python:3.12.8-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1

ENV PYTHONUNBUFFERED=1 

# Updated 2025-11-12: Removed unused 'behave' package
# Using pytest-bdd for BDD testing instead
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .
