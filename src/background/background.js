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
        
        const request = {
            method: details.method,
            url: details.url,
            type: details.type,
            requestId: details.requestId,
            timeStamp: details.timeStamp,
            requestBody: details.requestBody,
            startTime: Date.now()
        };

        // Если есть тело запроса, сохраняем его
        if (details.requestBody) {
            if (details.requestBody.raw) {
                const decoder = new TextDecoder('utf-8');
                request.requestData = decoder.decode(details.requestBody.raw[0].bytes);
            } else if (details.requestBody.formData) {
                request.formData = details.requestBody.formData;
            }
        }

        requests.set(details.requestId, request);

        if (windowId) {
            chrome.runtime.sendMessage({
                type: 'newRequest',
                request: request
            });
        }
    },
    { urls: ["<all_urls>"] },
    ["requestBody"]
);

// Сохраняем заголовки запроса
chrome.webRequest.onSendHeaders.addListener(
    (details) => {
        const request = requests.get(details.requestId);
        if (request) {
            request.requestHeaders = details.requestHeaders;
        }
    },
    { urls: ["<all_urls>"] },
    ["requestHeaders"]
);

// Сохраняем заголовки ответа
chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
        const request = requests.get(details.requestId);
        if (request) {
            request.responseHeaders = details.responseHeaders;
        }
    },
    { urls: ["<all_urls>"] },
    ["responseHeaders"]
);

// Обрабатываем завершение запросов
chrome.webRequest.onCompleted.addListener(
    (details) => {
        const request = requests.get(details.requestId);
        if (request) {
            request.status = details.statusCode;
            request.statusText = details.statusLine;
            request.endTime = Date.now();
            
            if (windowId) {
                chrome.runtime.sendMessage({
                    type: 'requestCompleted',
                    requestId: details.requestId,
                    status: details.statusCode,
                    timeStamp: details.timeStamp,
                    duration: request.endTime - request.startTime
                });
            }
            
            // Удаляем старые запросы для экономии памяти
            setTimeout(() => {
                requests.delete(details.requestId);
            }, 300000); // Храним 5 минут
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
            request.endTime = Date.now();
            
            if (windowId) {
                chrome.runtime.sendMessage({
                    type: 'requestCompleted',
                    requestId: details.requestId,
                    status: 0,
                    error: details.error,
                    timeStamp: details.timeStamp,
                    duration: request.endTime - request.startTime
                });
            }
            
            setTimeout(() => {
                requests.delete(details.requestId);
            }, 300000);
        }
    },
    { urls: ["<all_urls>"] }
);

// Обработчик сообщений от контент-скрипта
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getRequestDetails') {
        const request = requests.get(message.requestId);
        if (request) {
            sendResponse({
                success: true,
                request: request
            });
        } else {
            sendResponse({
                success: false,
                error: 'Request not found'
            });
        }
        return true;
    }
});