FROM python:3.12.8-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1

ENV PYTHONUNBUFFERED=1 

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .
