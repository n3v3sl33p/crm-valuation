# CRM Система Оценки Недвижимости

Полноценное веб-приложение для агентства оценки недвижимости (Backend + Frontend).

## Быстрый старт (Docker Compose)

Самый простой способ запустить всё приложение целиком.

### 1. Предварительная настройка

Создайте файл `.env` в папке `backend/`:

```env
SECRET_KEY=ваш_надежный_случайный_ключ
ALGORITHM=HS256
DATABASE_URL=sqlite+aiosqlite:///./valuation.db
```

### 2. Запуск

Из корня проекта выполните:

```bash
docker-compose up -d --build
```

### 3. Доступ к сервисам

*   **Frontend (Сайт):** `http://localhost` (порт 80)
*   **Backend (API/Swagger):** `http://localhost:8000/docs`

Frontend автоматически настроен проксировать запросы на `/api/` к бэкенду.

**Примечание:** База данных `backend/valuation.db` автоматически сохраняется между перезапусками Docker благодаря volume в `docker-compose.yml`.

---

## Разработка

### Backend (FastAPI)
Подробнее см. [backend/README.md](backend/README.md).

### Frontend (React + Vite)
Находится в папке `frontend`. Использует `Bun` как пакетный менеджер.

1.  Установка зависимостей:
    ```bash
    cd frontend
    bun install
    ```
2.  Запуск в режиме разработки:
    ```bash
    bun dev
    ```

