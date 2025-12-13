# CRM Система Оценки Недвижимости

Полноценное веб-приложение для агентства оценки недвижимости (Backend + Frontend).

## Быстрый старт (Docker Compose)

Самый простой способ запустить всё приложение целиком.

### 1. Предварительная настройка

Создайте файл `.env` в папке `backend/`:

```env
SECRET_KEY=ваш_надежный_случайный_ключ
ALGORITHM=HS256
DATABASE_URL=sqlite+aiosqlite:///./data/valuation.db
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

### 4. Создание тестовых пользователей

Чтобы наполнить базу данных, выполните команду внутри контейнера бэкенда:

```bash
docker-compose exec backend python seed.py
```

Пользователи:
*   `user1@mail.com` (CLIENT)
*   `user2@mail.com` (EMPLOYEE)
*   `user3@mail.com` (APPRAISER)
Пароль для всех: `Bebraa`

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

