FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
COPY pyproject.toml .

RUN pip install uv
RUN uv sync

COPY . .

RUN mkdir -p /app/data

ENV DATABASE_URL=sqlite+aiosqlite:///./data/valuation.db

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

