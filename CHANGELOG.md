# Changelog

## [2.0.0] - 2025-04-14

### Добавлено
- WebSocket Viewer - просмотрщик сообщений в реальном времени:
  - Подключение к WebSocket топикам по клику на "Посмотреть"
  - Отображение статуса соединения (подключено/отключено)
  - Автоматическое декодирование сообщений в реальном времени
  - Темный интерфейс для удобного чтения
  - Копирование отдельных сообщений
  - Переключение между оригиналом и декодированным видом
  - Временные метки для каждого сообщения
  - Кнопка очистки истории сообщений

## [1.1.0] - 2025-04-14

### Добавлено
- Улучшенный декодер WebSocket сообщений с поддержкой разных форматов:
  - Простой base64 -> JSON
  - Двойное base64 кодирование
  - Base64 + Zlib компрессия
  - Base64 + Zlib + Base64
- Индикация метода декодирования с цветовой дифференциацией
- Возможность копирования декодированного JSON
- Всплывающие подсказки (tooltips) для всех элементов управления

### Улучшено
- Интерфейс декодера WebSocket сообщений:
  - Добавлен вертикальный и горизонтальный скролл для длинных сообщений
  - Улучшено позиционирование кнопки копирования
  - Оптимизирована работа с большими JSON-объектами
  - Добавлены стилизованные скроллбары
- Улучшена обработка ошибок при декодировании

### Исправлено
- Проблема с переполнением контента в модальном окне декодера
- Исправлен курсор для элементов с подсказками
- Улучшено отображение длинных JSON-сообщений

## [1.0.0] - 2025-04-14

### Добавлено
- Базовый функционал перехвата HTTP(S)-запросов
- Таблица для отображения запросов с информацией:
  - Метод запроса
  - URL
  - Статус ответа
  - Тип запроса
  - Время выполнения
- Фильтрация запросов:
  - По типу (XHR, WebSocket, другие)
  - По тексту (URL, метод, статус)
- Цветовая индикация:
  - Методов запросов (GET, POST, PUT, DELETE)
  - Статусов ответов (2xx, 3xx, 4xx, 5xx)
- Базовый декодер WebSocket сообщений
- Уведомления о запросах с ошибками (4xx, 5xx)
- Счетчики запросов (всего, отфильтровано, ошибки)
- Горячие клавиши для основных действий