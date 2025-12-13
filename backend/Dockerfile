FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
COPY pyproject.toml .

RUN pip install uv
RUN uv sync

COPY . .

RUN mkdir -p /app/data

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

