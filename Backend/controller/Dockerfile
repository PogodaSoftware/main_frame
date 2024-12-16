FROM python:3.9.21 

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r ../requirements.txt

COPY . .
# Currently do not have the code underneath, will comment out for now 
# COPY --from=build-backend /app/backend/ .
# COPY --from=build-frontend /app/frontend/build /app/backend/static

EXPOSE 8000

CMD ["python", "./manage.py", "runserver", "0.0.0.0:8000"]

