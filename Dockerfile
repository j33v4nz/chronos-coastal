FROM node:22-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 CHRONOS_DATA_DIR=/data
WORKDIR /app
COPY backend/requirements-lock.txt ./requirements.txt
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY backend/app ./backend/app
COPY --from=frontend /build/dist ./frontend/dist
RUN useradd --uid 10001 --create-home chronos && mkdir /data && chown chronos:chronos /data
USER chronos
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health', timeout=3)"
CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
