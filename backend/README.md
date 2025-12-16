# CRM Система Оценки Недвижимости (Backend)

Backend-сервис для агентства оценки недвижимости, реализованный на FastAPI. Предоставляет API для полного цикла обработки заявок на оценку: от создания заявки клиентом до финального утверждения отчета.

## Технологический стек

*   **Язык**: Python 3.13+
*   **Фреймворк**: FastAPI
*   **База данных**: SQLite (с использованием `aiosqlite` для асинхронности)
*   **ORM**: SQLAlchemy (Async)
*   **Аутентификация**: JWT (JSON Web Tokens), bcrypt
*   **Валидация**: Pydantic v2
*   **Контейнеризация**: Docker

## Структура проекта

*   `app/api/v1` - Эндпоинты API (авторизация, пользователи, заявки).
*   `app/core` - Конфигурация, подключение к БД, безопасность.
*   `app/models` - Модели базы данных (SQLAlchemy).
*   `app/schemas` - Pydantic схемы для валидации данных.
*   `seed.py` - Скрипт для начального заполнения базы данных тестовыми пользователями.

## Ролевая модель

1.  **CLIENT (Клиент)**: Создает заявки, следит за статусом, принимает финальный отчет.
2.  **EMPLOYEE (Сотрудник)**: Менеджер. Согласовывает заявки, назначает оценщиков, проверяет отчеты перед отправкой клиенту.
3.  **APPRAISER (Оценщик)**: Получает назначенные заявки, проводит осмотр, загружает отчет (в виде текста/ссылки).

## Запуск проекта

### Вариант 1: Docker (Рекомендуемый)

1.  **Создайте файл `.env` в папке `backend`:**
    ```env
    SECRET_KEY=ваш_надежный_ключ_минимум_32_символа
    ALGORITHM=HS256
    DATABASE_URL=sqlite+aiosqlite:///./data/valuation.db
    ```

2.  **Сборка образа:**
    В папке `backend` выполните команду:
    ```bash
    docker build -t valuation-backend .
    ```

3.  **Запуск контейнера:**
    Запустите контейнер, пробросив файл `.env` и смонтировав файл базы данных:
    ```bash
    # Linux / MacOS
    docker run -d -p 8000:8000 \
      --env-file .env \
      -v $(pwd)/data:/app/data \
      valuation-backend
    
    # Windows (PowerShell)
    docker run -d -p 8000:8000 `
      --env-file .env `
      -v ${PWD}/data:/app/data `
      valuation-backend
    ```
    
    **Или используйте Docker Compose** (рекомендуется):
    ```bash
    docker-compose up -d --build
    ```

4.  **Доступ:**
    Сервис будет доступен по адресу: `http://localhost:8000`.
    Автоматическая документация (Swagger UI): `http://localhost:8000/docs`.
    
    **Примечание:** База данных `valuation.db` сохраняется между перезапусками контейнера благодаря volume. Файл базы данных находится в папке `backend/` на хосте.

### Вариант 2: Локальный запуск (Без Docker)

1.  Установите зависимости с помощью `uv`:
    ```bash
    cd backend
    pip install uv
    uv sync
    ```

2.  Создайте файл `.env` в папке `backend`:
    ```env
    SECRET_KEY=ваш_надежный_ключ_минимум_32_символа
    ALGORITHM=HS256
    DATABASE_URL=sqlite+aiosqlite:///./valuation.db
    ```

3.  Запустите сервер:
    ```bash
    uv run uvicorn app.main:app --reload
    ```


## Сценарий работы (Workflow)

Ниже описан "счастливый путь" обработки заявки через API (Swagger UI).

### Шаг 0: Авторизация
Используйте эндпоинт `POST /api/v1/auth/login`. Полученный `access_token` нужно вставить в кнопку **Authorize** вверху Swagger UI (формат: `Bearer <token>`, но Swagger часто подставляет префикс сам, вводите просто токен или как просит UI).

### Шаг 1: Клиент создает заявку
*   **Кто:** `user1@mail.com` (CLIENT)
*   **Метод:** `POST /api/v1/valuations/`
*   **Тело запроса:**
    ```json
    {
      "address": "Москва, ул. Пушкина 10",
      "property_type": "Квартира",
      "room_count": 2,
      "room_details": "Черновая отделка"
    }
    ```
*   **Результат:** Заявка создана, статус `CREATED`.

### Шаг 2: Сотрудник проверяет и согласовывает
*   **Кто:** `user2@mail.com` (EMPLOYEE)
*   **Метод:** `PATCH /api/v1/valuations/{id}` (где `{id}` - номер заявки из шага 1)
*   **Тело запроса:**
    ```json
    {
      "status": "APPROVED_BY_EMPLOYEE",
      "comment_text": "Заявка принята. Ищем оценщика."
    }
    ```

### Шаг 3: Сотрудник назначает Оценщика
*   **Кто:** `user2@mail.com` (EMPLOYEE)
*   **Действие:** Назначает оценщика (например, ID=3 для `user3@mail.com`).
*   **Метод:** `PATCH /api/v1/valuations/{id}`
*   **Тело запроса:**
    ```json
    {
      "appraiser_id": 3,
      "comment_text": "Назначен оценщик user3."
    }
    ```
*   **Результат:** Статус автоматически меняется на `APPRAISER_ASSIGNED`.

### Шаг 4: Оценщик сдает отчет
*   **Кто:** `user3@mail.com` (APPRAISER)
*   **Метод:** `PATCH /api/v1/valuations/{id}`
*   **Тело запроса:**
    ```json
    {
      "status": "REPORT_SUBMITTED",
      "comment_text": "Оценка завершена. Рыночная стоимость: 12 млн. руб. Ссылка на отчет: http://..."
    }
    ```
*   **Важно:** Текст комментария на этом этапе считается содержанием отчета.

### Шаг 5: Сотрудник утверждает отчет
*   **Кто:** `user2@mail.com` (EMPLOYEE)
*   **Метод:** `PATCH /api/v1/valuations/{id}`
*   **Тело запроса:**
    ```json
    {
      "status": "REPORT_APPROVED_BY_EMPLOYEE",
      "comment_text": "Отчет проверен, отправлен клиенту."
    }
    ```

### Шаг 6: Клиент принимает работу
*   **Кто:** `user1@mail.com` (CLIENT)
*   **Метод:** `PATCH /api/v1/valuations/{id}`
*   **Тело запроса:**
    ```json
    {
      "status": "COMPLETED",
      "comment_text": "Спасибо, работа принята."
    }
    ```

