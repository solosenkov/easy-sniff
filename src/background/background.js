let windowId = null;
const requests = new Map();

// Открываем окно при клике на иконку расширения
chrome.browserAction.onClicked.addListener(() => {
    if (windowId === null) {
        chrome.windows.create({
            url: chrome.runtime.getURL('index.html'),
            type: 'popup',
            width: 1200,
            height: 800
        }, (window) => {
            windowId = window.id;
        });
    } else {
        chrome.windows.update(windowId, { focused: true });
    }
});

// Отслеживаем закрытие окна
chrome.windows.onRemoved.addListener((removedWindowId) => {
    if (removedWindowId === windowId) {
        windowId = null;
    }
});

// Перехватываем запросы
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        if (details.type === 'main_frame') return;
        
        requests.set(details.requestId, {
            method: details.method,
            url: details.url,
            type: details.type,
            requestId: details.requestId,
            timeStamp: details.timeStamp
        });

        // Отправляем информацию о новом запросе
        if (windowId) {
            chrome.runtime.sendMessage({
                type: 'newRequest',
                request: requests.get(details.requestId)
            });
        }
    },
    { urls: ["<all_urls>"] },
    ["requestBody"]
);

// Обрабатываем завершение запросов
chrome.webRequest.onCompleted.addListener(
    (details) => {
        const request = requests.get(details.requestId);
        if (request) {
            request.status = details.statusCode;
            request.statusText = details.statusLine;
            
            // Отправляем информацию о завершении запроса
            if (windowId) {
                chrome.runtime.sendMessage({
                    type: 'requestCompleted',
                    requestId: details.requestId,
                    status: details.statusCode,
                    timeStamp: details.timeStamp
                });
            }
            
            // Удаляем старые запросы для экономии памяти
            setTimeout(() => {
                requests.delete(details.requestId);
            }, 5000);
        }
    },
    { urls: ["<all_urls>"] }
);

// Обрабатываем ошибки запросов
chrome.webRequest.onErrorOccurred.addListener(
    (details) => {
        const request = requests.get(details.requestId);
        if (request) {
            request.status = 0;
            request.error = details.error;
            
            if (windowId) {
                chrome.runtime.sendMessage({
                    type: 'requestCompleted',
                    requestId: details.requestId,
                    status: 0,
                    error: details.error,
                    timeStamp: details.timeStamp
                });
            }
            
            setTimeout(() => {
                requests.delete(details.requestId);
            }, 5000);
        }
    },
    { urls: ["<all_urls>"] }
);