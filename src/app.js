document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('requestsTableBody');
    const filterInput = document.getElementById('filter');
    const clearFilterButton = document.getElementById('clearFilter');
    const typeFilters = document.querySelectorAll('.filter-type input');
    const headers = document.querySelectorAll('th[data-sort]');
    const totalRequestsSpan = document.getElementById('totalRequests');
    const filteredRequestsSpan = document.getElementById('filteredRequests');
    const errorRequestsSpan = document.getElementById('errorRequests');
    const allRequestsButton = document.getElementById('allRequestsMode');
    const errorsButton = document.getElementById('errorsMode');
    const notificationsContainer = document.getElementById('notifications');
    
    let requests = [];
    let currentSort = { column: null, direction: 'asc' };
    let viewMode = 'all'; // 'all' или 'errors'
    
    // Переключение режимов просмотра
    allRequestsButton.addEventListener('click', () => {
        viewMode = 'all';
        allRequestsButton.classList.add('active');
        errorsButton.classList.remove('active');
        renderRequests(filterRequests());
    });

    errorsButton.addEventListener('click', () => {
        viewMode = 'errors';
        errorsButton.classList.add('active');
        allRequestsButton.classList.remove('active');
        renderRequests(filterRequests());
    });

    // Обработка сортировки
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            
            // Сброс стрелок сортировки у всех колонок
            headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
            
            // Определяем направление сортировки
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }
            
            // Добавляем класс для отображения стрелки
            header.classList.add(`sorted-${currentSort.direction}`);
            
            renderRequests(filterRequests());
        });
    });

    // Форматирование времени
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 3 
        });
    }

    // Копирование в буфер обмена
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Ошибка при копировании:', err);
            return false;
        }
    }

    // Фильтрация запросов
    function filterRequests() {
        const filterValue = filterInput.value.toLowerCase();
        const activeTypes = Array.from(typeFilters)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        const filtered = requests.filter(request => {
            // Проверка режима ошибок
            if (viewMode === 'errors') {
                const statusGroup = Math.floor((request.status || 0) / 100);
                if (statusGroup !== 4 && statusGroup !== 5) {
                    return false;
                }
            }

            // Фильтр по типу
            let matchesType = false;
            if (request.type === 'xmlhttprequest' && activeTypes.includes('xhr')) {
                matchesType = true;
            } else if (request.type === 'websocket' && activeTypes.includes('websocket')) {
                matchesType = true;
            } else if (activeTypes.includes('other') && 
                      !['xmlhttprequest', 'websocket'].includes(request.type)) {
                matchesType = true;
            }

            // Фильтр по тексту
            const matchesText = 
                request.url.toLowerCase().includes(filterValue) ||
                request.method.toLowerCase().includes(filterValue) ||
                request.type.toLowerCase().includes(filterValue) ||
                String(request.status).includes(filterValue);

            return matchesType && matchesText;
        });

        // Обновляем счетчики
        totalRequestsSpan.textContent = requests.length;
        filteredRequestsSpan.textContent = filtered.length;
        
        // Обновляем счетчик ошибок
        const errorCount = requests.filter(request => {
            const statusGroup = Math.floor((request.status || 0) / 100);
            return statusGroup === 4 || statusGroup === 5;
        }).length;
        errorRequestsSpan.textContent = errorCount;

        return filtered;
    }

    // Обработка изменения фильтров
    filterInput.addEventListener('input', () => {
        renderRequests(filterRequests());
    });

    typeFilters.forEach(filter => {
        filter.addEventListener('change', () => {
            renderRequests(filterRequests());
        });
    });

    // Очистка всех данных
    clearFilterButton.addEventListener('click', () => {
        requests = [];
        filterInput.value = '';
        renderRequests([]);
    });

    // Получение класса для статуса
    function getStatusClass(status) {
        if (!status) return 'status-pending';
        const statusGroup = Math.floor(status / 100);
        return `status-${statusGroup}xx`;
    }

    // Вычисление длительности запроса
    function calculateDuration(request) {
        if (!request.endTime) return '...';
        return (request.endTime - request.startTime).toFixed(2);
    }

    // Отрисовка запросов в таблице
    function renderRequests(requestsToRender) {
        // Сортировка запросов
        if (currentSort.column) {
            requestsToRender.sort((a, b) => {
                let valueA = currentSort.column === 'duration' 
                    ? parseFloat(calculateDuration(a)) || 0
                    : a[currentSort.column];
                let valueB = currentSort.column === 'duration'
                    ? parseFloat(calculateDuration(b)) || 0
                    : b[currentSort.column];
                
                if (typeof valueA === 'string') valueA = valueA.toLowerCase();
                if (typeof valueB === 'string') valueB = valueB.toLowerCase();
                
                if (valueA < valueB) return currentSort.direction === 'asc' ? -1 : 1;
                if (valueA > valueB) return currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        tableBody.innerHTML = '';
        
        requestsToRender.forEach(request => {
            const row = document.createElement('tr');
            
            // Добавляем ячейку времени выполнения
            const timeCell = document.createElement('td');
            timeCell.className = 'timestamp';
            timeCell.textContent = calculateDuration(request);
            
            row.appendChild(timeCell);
            row.appendChild(createMethodCell(request));
            row.appendChild(createUrlCell(request));
            row.appendChild(createStatusCell(request));
            row.appendChild(createTypeCell(request));
            row.appendChild(createActionsCell(request));
            
            tableBody.appendChild(row);
        });
    }

    // Вспомогательные функции для создания ячеек
    function createMethodCell(request) {
        const cell = document.createElement('td');
        const span = document.createElement('span');
        span.textContent = request.method;
        span.className = `method method-${request.method}`;
        cell.appendChild(span);
        return cell;
    }

    function createUrlCell(request) {
        const cell = document.createElement('td');
        cell.className = 'url-cell';
        
        const content = document.createElement('div');
        content.className = 'url-content';
        content.textContent = request.url;
        content.title = request.url;
        
        content.addEventListener('click', () => {
            content.classList.toggle('expanded');
        });
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Копировать';
        copyButton.onclick = async (e) => {
            e.stopPropagation();
            const success = await copyToClipboard(request.url);
            if (success) {
                copyButton.textContent = 'Скопировано!';
                setTimeout(() => {
                    copyButton.textContent = 'Копировать';
                }, 1500);
            }
        };
        
        cell.appendChild(content);
        cell.appendChild(copyButton);
        return cell;
    }

    function createStatusCell(request) {
        const cell = document.createElement('td');
        const span = document.createElement('span');
        span.textContent = request.status || 'pending';
        span.className = `status ${getStatusClass(request.status)}`;
        cell.appendChild(span);
        return cell;
    }

    function createTypeCell(request) {
        const cell = document.createElement('td');
        cell.textContent = request.type;
        return cell;
    }

    function createActionsCell(request) {
        const cell = document.createElement('td');
        const button = document.createElement('button');
        button.textContent = 'Посмотреть';
        button.onclick = () => viewRequest(request);
        cell.appendChild(button);
        return cell;
    }

    // Просмотр деталей запроса
    async function viewRequest(request) {
        if (request.type === 'websocket') {
            currentWsUrl = request.url;
            wsViewerModal.style.display = 'block';
            if (!wsConnection) {
                connectToWebSocket(currentWsUrl);
            }
        } else {
            // Здесь будет функционал для просмотра обычных запросов
            console.log('Детали запроса:', request);
        }
    }

    // Функция для создания уведомления
    function showNotification(message, type = 'error') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = document.createElement('span');
        icon.innerHTML = '⚠️';
        
        const text = document.createElement('span');
        text.textContent = message;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'notification-close';
        closeButton.innerHTML = '×';
        closeButton.onclick = () => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        };
        
        notification.appendChild(icon);
        notification.appendChild(text);
        notification.appendChild(closeButton);
        
        notificationsContainer.appendChild(notification);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Получение новых запросов от background script
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'newRequest') {
            const request = message.request;
            request.startTime = Date.now();
            requests.unshift(request);
            
            // Ограничиваем количество запросов
            if (requests.length > 1000) {
                requests.pop();
            }
            
            renderRequests(filterRequests());
        } else if (message.type === 'requestCompleted') {
            // Обновляем время завершения запроса
            const request = requests.find(r => r.requestId === message.requestId);
            if (request) {
                request.endTime = Date.now();
                request.status = message.status;
                renderRequests(filterRequests());
            }
        }
    });

    // Функционал декодера WS
    const modal = document.getElementById('wsDecoderModal');
    const wsDecoderBtn = document.getElementById('wsDecoder');
    const closeBtn = modal.querySelector('.close');
    const decodeButton = document.getElementById('decodeButton');
    const encodedInput = document.getElementById('encodedMessage');
    const decodedOutput = document.getElementById('decodedMessage');

    // Открытие/закрытие модального окна
    wsDecoderBtn.onclick = () => modal.style.display = 'block';
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // Функция для форматирования JSON с подсветкой синтаксиса
    function syntaxHighlight(json) {
        if (typeof json != 'string') {
            json = JSON.stringify(json, null, 2);
        }
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'json-key';
                } else {
                    cls = 'json-string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    // Функция декодирования Base64
    function base64Decode(str) {
        try {
            return atob(str);
        } catch (e) {
            throw new Error('Ошибка декодирования Base64');
        }
    }

    // Функция проверки, является ли строка валидным JSON
    function isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Функция декомпрессии данных
    async function decompress(data) {
        try {
            const ds = new DecompressionStream('deflate');
            const blob = new Blob([data]);
            const compressedStream = blob.stream().pipeThrough(ds);
            const arrayBuffer = await new Response(compressedStream).arrayBuffer();
            return new TextDecoder().decode(arrayBuffer);
        } catch (e) {
            throw new Error('Ошибка декомпрессии данных');
        }
    }

    // Обновленная функция декодирования
    async function decodeMessage(encodedMessage) {
        try {
            // Очищаем строку от кавычек в начале и конце
            let cleanMessage = encodedMessage;
            if (cleanMessage.startsWith('"') && cleanMessage.endsWith('"')) {
                cleanMessage = cleanMessage.slice(1, -1);
            }
            // Заменяем экранированные кавычки на обычные
            cleanMessage = cleanMessage.replace(/\\"/g, '"');

            // Шаг 1: Пробуем простое base64 декодирование
            const simpleDecoded = base64Decode(cleanMessage);
            
            // Если получился валидный JSON, возвращаем его
            if (isValidJSON(simpleDecoded)) {
                return {
                    success: true,
                    data: JSON.parse(simpleDecoded),
                    method: 'base64'
                };
            }

            // Если это UTF-8 текст, пробуем декодировать его как base64
            try {
                const doubleDecoded = base64Decode(simpleDecoded);
                if (isValidJSON(doubleDecoded)) {
                    return {
                        success: true,
                        data: JSON.parse(doubleDecoded),
                        method: 'double_base64'
                    };
                }
            } catch (e) {
                // Игнорируем ошибку и продолжаем
            }

            // Шаг 2: Пробуем декодирование со сжатием
            const decompressed = await decompress(new Uint8Array([...simpleDecoded].map(c => c.charCodeAt(0))));
            
            try {
                // Пробуем второй уровень base64 после декомпрессии
                const decompressedDecoded = base64Decode(decompressed);
                if (isValidJSON(decompressedDecoded)) {
                    return {
                        success: true,
                        data: JSON.parse(decompressedDecoded),
                        method: 'base64_zlib_base64'
                    };
                }
            } catch (e) {
                // Если не удалось декодировать второй раз, проверяем сам decompressed
                if (isValidJSON(decompressed)) {
                    return {
                        success: true,
                        data: JSON.parse(decompressed),
                        method: 'base64_zlib'
                    };
                }
            }

            throw new Error('Не удалось декодировать сообщение ни одним из способов');
        } catch (e) {
            return { 
                success: false, 
                error: e.message 
            };
        }
    }

    // Обновляем обработчик кнопки декодирования
    decodeButton.addEventListener('click', async () => {
        const encodedMessage = encodedInput.value.trim();
        const spinner = document.getElementById('decodeSpinner');
        if (!encodedMessage) {
            decodedOutput.innerHTML = '<span class="json-null">Введите закодированное сообщение</span>';
            return;
        }

        try {
            decodeButton.disabled = true;
            spinner.style.display = 'inline-block';
            
            const result = await decodeMessage(encodedMessage);
            
            if (result.success) {
                const methodBadge = result.method ? 
                    `<div class="decode-method">Метод декодирования: <span class="badge">${result.method}</span></div>` : '';
                
                if (typeof result.data === 'object') {
                    decodedOutput.innerHTML = methodBadge + syntaxHighlight(result.data);
                } else {
                    decodedOutput.textContent = result.data;
                }
            } else {
                decodedOutput.innerHTML = `<span class="json-null">Ошибка: ${result.error}</span>`;
            }
        } catch (error) {
            decodedOutput.innerHTML = `<span class="json-null">Ошибка декодирования: ${error.message}</span>`;
        } finally {
            decodeButton.disabled = false;
            spinner.style.display = 'none';
        }
    });

    // Добавляем копирование декодированного результата
    const copyJsonButton = document.querySelector('.copy-json-button');
    const successIndicator = document.querySelector('.success-indicator');
    
    copyJsonButton.addEventListener('click', async () => {
        const decodedText = decodedOutput.textContent;
        if (!decodedText) return;

        try {
            await navigator.clipboard.writeText(decodedText);
            successIndicator.style.display = 'block';
            setTimeout(() => {
                successIndicator.style.display = 'none';
            }, 2000);
        } catch (err) {
            console.error('Ошибка при копировании:', err);
        }
    });

    // Обработка горячих клавиш
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + D для открытия декодера
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            wsDecoderBtn.click();
        }
        // Ctrl/Cmd + C для очистки
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !window.getSelection().toString()) {
            e.preventDefault();
            clearFilterButton.click();
        }
        // Esc для закрытия модального окна
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });

    // WebSocket Viewer
    const wsViewerModal = document.getElementById('wsViewerModal');
    const wsConnectBtn = document.getElementById('wsConnect');
    const wsClearBtn = document.getElementById('wsClear');
    const wsAutoDecodeBtn = document.getElementById('wsAutoDecode');
    const wsStatusIndicator = document.querySelector('.ws-status-indicator');
    const wsStatusText = document.querySelector('.ws-status-text');
    const wsMessages = document.getElementById('wsMessages');
    
    let currentWsUrl = null;
    let wsConnection = null;
    let isAutoDecode = false;

    // Скрываем кнопку авто-декодирования
    wsAutoDecodeBtn.style.display = 'none';
    
    // Функция для форматирования времени
    function formatDateTime(date) {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    }

    // Обновляем функцию создания элемента сообщения
    function createMessageElement(message, timestamp, isDecoded = false) {
        const messageEl = document.createElement('div');
        messageEl.className = 'ws-message';
        
        const header = document.createElement('div');
        header.className = 'ws-message-header';
        
        const time = document.createElement('span');
        time.className = 'ws-message-time';
        time.textContent = formatDateTime(new Date(timestamp));
        
        const controls = document.createElement('div');
        controls.className = 'ws-message-controls';
        
        const decodeBtn = document.createElement('button');
        decodeBtn.className = 'ws-message-action';
        decodeBtn.textContent = 'Декодировать';
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'ws-message-action';
        copyBtn.textContent = 'Копировать';
        
        controls.appendChild(decodeBtn);
        controls.appendChild(copyBtn);
        header.appendChild(time);
        header.appendChild(controls);
        
        const content = document.createElement('div');
        content.className = 'ws-message-content';
        content.textContent = message;
        
        messageEl.appendChild(header);
        messageEl.appendChild(content);
        
        // Обработчики событий
        decodeBtn.onclick = () => {
            console.log('Сообщение для декодирования:', message);
            
            // Получаем элементы модального окна
            const wsDecoderModal = document.getElementById('wsDecoderModal');
            const encodedInput = document.getElementById('encodedMessage');
            const decodeButton = document.getElementById('decodeButton');
            
            // Очищаем предыдущий результат
            document.getElementById('decodedMessage').innerHTML = '';
            
            // Открываем модальное окно
            wsDecoderModal.style.display = 'block';
            
            // Вставляем сообщение в поле ввода
            encodedInput.value = message;
            console.log('Вставленное сообщение:', encodedInput.value);
            
            // Запускаем декодирование
            setTimeout(() => {
                decodeButton.click();
            }, 100);
        };
        
        copyBtn.onclick = async () => {
            // ...existing code...
        };
        
        return messageEl;
    }

    // Обновление статуса WebSocket соединения
    function updateWsStatus(isConnected) {
        wsStatusIndicator.classList.toggle('connected', isConnected);
        wsStatusText.textContent = isConnected ? 'Подключено' : 'Отключено';
        wsConnectBtn.textContent = isConnected ? 'Отключиться' : 'Подключиться';
    }

    // Подключение к WebSocket
    function connectToWebSocket(url) {
        if (wsConnection) {
            wsConnection.close();
        }

        try {
            wsConnection = new WebSocket(url);
            
            wsConnection.onopen = () => {
                updateWsStatus(true);
                showNotification('WebSocket подключен', 'success');
            };
            
            wsConnection.onclose = () => {
                updateWsStatus(false);
                wsConnection = null;
            };
            
            wsConnection.onerror = (error) => {
                showNotification('Ошибка WebSocket: ' + error.message, 'error');
            };
            
            wsConnection.onmessage = async (event) => {
                const messageEl = createMessageElement(
                    event.data,
                    Date.now(),
                    isAutoDecode
                );
                
                if (isAutoDecode) {
                    try {
                        // Очищаем сообщение от экранированных кавычек
                        const cleanMessage = event.data.replace(/\\"/g, '"');
                        const result = await decodeMessage(cleanMessage);
                        if (result.success) {
                            const content = messageEl.querySelector('.ws-message-content');
                            content.innerHTML = syntaxHighlight(result.data);
                            content.classList.add('decoded');
                            messageEl.querySelector('.ws-message-action').textContent = 'Показать оригинал';
                        }
                    } catch (e) {
                        console.error('Ошибка автодекодирования:', e);
                    }
                }
                
                wsMessages.insertBefore(messageEl, wsMessages.firstChild);
            };
        } catch (error) {
            showNotification('Ошибка подключения: ' + error.message, 'error');
        }
    }

    // Обработчики событий для WebSocket viewer
    wsConnectBtn.onclick = () => {
        if (wsConnection) {
            wsConnection.close();
        } else if (currentWsUrl) {
            connectToWebSocket(currentWsUrl);
        }
    };

    wsClearBtn.onclick = () => {
        wsMessages.innerHTML = '';
    };

    wsAutoDecodeBtn.onclick = () => {
        isAutoDecode = !isAutoDecode;
        wsAutoDecodeBtn.classList.toggle('active', isAutoDecode);
    };

    // Закрытие WebSocket viewer
    wsViewerModal.querySelector('.close').onclick = () => {
        wsViewerModal.style.display = 'none';
        if (wsConnection) {
            wsConnection.close();
        }
    };

    // Закрытие по клику вне модального окна
    window.onclick = (event) => {
        if (event.target === wsViewerModal) {
            wsViewerModal.style.display = 'none';
            if (wsConnection) {
                wsConnection.close();
            }
        }
    };

    // JWT Декодер
    const jwtModal = document.getElementById('jwtDecoderModal');
    const jwtDecoderBtn = document.getElementById('jwtDecoder');
    const jwtCloseBtn = jwtModal.querySelector('.close');
    const jwtDecodeButton = document.getElementById('jwtDecodeButton');
    const jwtInput = document.getElementById('jwtInput');
    const jwtSpinner = document.getElementById('jwtDecodeSpinner');
    
    // Открытие/закрытие модального окна JWT декодера
    jwtDecoderBtn.onclick = () => jwtModal.style.display = 'block';
    jwtCloseBtn.onclick = () => jwtModal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == jwtModal) {
            jwtModal.style.display = 'none';
        }
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // Функция декодирования JWT
    function decodeJWT(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Неверный формат JWT токена');
            }

            // Декодируем каждую часть
            const decodedHeader = JSON.parse(atob(parts[0]));
            const decodedPayload = JSON.parse(atob(parts[1]));
            // Подпись оставляем как есть, она в base64
            const signature = parts[2];

            return {
                success: true,
                header: decodedHeader,
                payload: decodedPayload,
                signature: signature
            };
        } catch (e) {
            return {
                success: false,
                error: e.message
            };
        }
    }

    // Обработчик кнопки декодирования JWT
    jwtDecodeButton.addEventListener('click', () => {
        const token = jwtInput.value.trim();
        if (!token) {
            document.getElementById('jwtHeader').innerHTML = 
                '<span class="json-null">Введите JWT токен</span>';
            return;
        }

        try {
            jwtDecodeButton.disabled = true;
            jwtSpinner.style.display = 'inline-block';
            
            const result = decodeJWT(token);
            
            if (result.success) {
                document.getElementById('jwtHeader').innerHTML = 
                    syntaxHighlight(result.header);
                document.getElementById('jwtPayload').innerHTML = 
                    syntaxHighlight(result.payload);
                document.getElementById('jwtSignature').textContent = 
                    result.signature;
            } else {
                document.getElementById('jwtHeader').innerHTML = 
                    `<span class="json-null">Ошибка: ${result.error}</span>`;
                document.getElementById('jwtPayload').innerHTML = '';
                document.getElementById('jwtSignature').textContent = '';
            }
        } catch (error) {
            document.getElementById('jwtHeader').innerHTML = 
                `<span class="json-null">Ошибка декодирования: ${error.message}</span>`;
        } finally {
            jwtDecodeButton.disabled = false;
            jwtSpinner.style.display = 'none';
        }
    });

    // Копирование payload
    const jwtCopyButton = jwtModal.querySelector('.copy-json-button');
    jwtCopyButton.addEventListener('click', async () => {
        const payload = document.getElementById('jwtPayload').textContent;
        if (!payload) return;

        try {
            await navigator.clipboard.writeText(payload);
            const successIndicator = jwtCopyButton.querySelector('.success-indicator');
            successIndicator.style.display = 'inline';
            setTimeout(() => {
                successIndicator.style.display = 'none';
            }, 2000);
        } catch (err) {
            console.error('Ошибка при копировании:', err);
        }
    });

    // Добавляем горячую клавишу для открытия JWT декодера (Ctrl/Cmd + J)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
            e.preventDefault();
            jwtDecoderBtn.click();
        }
    });

    // Функции для работы с модальным окном запроса
    const requestViewerModal = document.getElementById('requestViewerModal');
    const requestTabs = document.querySelectorAll('.request-tabs .tab-button');
    const copyAsCurlBtn = document.getElementById('copyAsCurl');

    // Переключение вкладок
    requestTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-button.active');
            const activePane = document.querySelector('.tab-pane.active');
            
            activeTab.classList.remove('active');
            activePane.classList.remove('active');
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Функция для форматирования JSON
    function formatJSON(json) {
        try {
            if (typeof json === 'string') {
                json = JSON.parse(json);
            }
            return JSON.stringify(json, null, 2);
        } catch (e) {
            return json;
        }
    }

    // Функция для форматирования заголовков
    function formatHeaders(headers) {
        if (!headers) return '';
        return headers.map(h => `${h.name}: ${h.value}`).join('\n');
    }

    // Функция для генерации cURL запроса
    function generateCurl(request) {
        let curl = `curl -X ${request.method} '${request.url}'`;
        
        // Добавляем заголовки
        if (request.requestHeaders) {
            request.requestHeaders.forEach(header => {
                curl += `\n  -H '${header.name}: ${header.value}'`;
            });
        }
        
        // Добавляем тело запроса
        if (request.requestData) {
            try {
                const data = JSON.stringify(JSON.parse(request.requestData));
                curl += `\n  -d '${data}'`;
            } catch (e) {
                curl += `\n  -d '${request.requestData}'`;
            }
        } else if (request.formData) {
            for (const [key, value] of Object.entries(request.formData)) {
                curl += `\n  -F '${key}=${value}'`;
            }
        }
        
        return curl;
    }

    // Функция для показа деталей запроса
    async function viewRequest(request) {
        if (request.type === 'websocket') {
            // Обработка WebSocket осталась без изменений
            currentWsUrl = request.url;
            wsViewerModal.style.display = 'block';
            if (!wsConnection) {
                connectToWebSocket(currentWsUrl);
            }
            return;
        }
        
        // Получаем полные детали запроса из background script
        chrome.runtime.sendMessage({
            type: 'getRequestDetails',
            requestId: request.requestId
        }, response => {
            if (response.success) {
                const details = response.request;
                
                // Заполняем основную информацию
                document.getElementById('reqMethod').textContent = details.method;
                document.getElementById('reqUrl').textContent = details.url;
                document.getElementById('reqStatus').textContent = details.status || 'pending';
                document.getElementById('reqType').textContent = details.type;
                document.getElementById('reqTime').textContent = `${details.duration || '...'} ms`;
                
                // Заполняем заголовки
                document.getElementById('requestHeaders').textContent = formatHeaders(details.requestHeaders);
                document.getElementById('responseHeaders').textContent = formatHeaders(details.responseHeaders);
                
                // Заполняем Query Parameters
                const url = new URL(details.url);
                const params = {};
                url.searchParams.forEach((value, key) => {
                    params[key] = value;
                });
                document.getElementById('queryParams').textContent = formatJSON(params);
                
                // Заполняем тело запроса
                if (details.requestData) {
                    document.getElementById('requestBody').textContent = formatJSON(details.requestData);
                } else if (details.formData) {
                    document.getElementById('requestBody').textContent = formatJSON(details.formData);
                }
                
                // Настройка временной шкалы
                if (details.startTime && details.endTime) {
                    const duration = details.endTime - details.startTime;
                    document.getElementById('requestTime').style.width = '30%';
                    document.getElementById('responseTime').style.width = '70%';
                }
                
                // Обработчик копирования как cURL
                copyAsCurlBtn.onclick = async () => {
                    const curl = generateCurl(details);
                    await copyToClipboard(curl);
                    showNotification('cURL скопирован в буфер обмена', 'success');
                };
                
                // Показываем модальное окно
                requestViewerModal.style.display = 'block';
            }
        });
    }

    // Закрытие модального окна
    requestViewerModal.querySelector('.close').onclick = () => {
        requestViewerModal.style.display = 'none';
    };

    // Копирование содержимого
    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', async () => {
            const target = document.getElementById(button.dataset.target);
            if (target) {
                await copyToClipboard(target.textContent);
                showNotification('Скопировано в буфер обмена', 'success');
            }
        });
    });

    // cURL Sender
    const curlSenderModal = document.getElementById('curlSenderModal');
    const curlSenderBtn = document.getElementById('curlSender');
    const curlInput = document.getElementById('curlInput');
    const parseCurlButton = document.getElementById('parseCurlButton');
    const clearCurlButton = document.getElementById('clearCurl');
    const sendCurlRequest = document.getElementById('sendCurlRequest');
    const parsedCurlSection = document.querySelector('.parsed-curl-section');
    const responseSection = document.querySelector('.response-section');
    
    // Открытие/закрытие модального окна
    curlSenderBtn.onclick = () => {
        curlSenderModal.style.display = 'block';
        clearCurlForm();
    };
    
    curlSenderModal.querySelector('.close').onclick = () => {
        curlSenderModal.style.display = 'none';
    };

    // Очистка формы
    function clearCurlForm() {
        curlInput.value = '';
        parsedCurlSection.style.display = 'none';
        responseSection.style.display = 'none';
        document.getElementById('requestBodyEditor').value = '';
        document.getElementById('requestMethodBadge').textContent = '';
        document.getElementById('requestUrlDisplay').textContent = '';
    }

    clearCurlButton.onclick = clearCurlForm;

    // Функция для парсинга cURL запроса
    function parseCurlCommand(curlCommand) {
        // Убираем переносы строк с обратным слешем и нормализуем пробелы
        const cleanCommand = curlCommand
            .replace(/\\\r?\n\s*/g, ' ')  // Убираем переносы строк с бэкслешем
            .replace(/\s+/g, ' ')         // Заменяем множественные пробелы на один
            .trim();

        const result = {
            method: 'GET',
            url: '',
            headers: {},
            body: null,
            cookies: {}
        };

        // Извлекаем URL - ищем первый аргумент в кавычках после curl
        const urlMatch = cleanCommand.match(/curl\s+['"]([^'"]+)['"]/);
        if (urlMatch) {
            result.url = urlMatch[1];
        }

        // Ищем явно указанный метод через -X или --request
        const methodMatch = cleanCommand.match(/-X\s+['"]?([A-Z]+)['"]?|--request\s+['"]?([A-Z]+)['"]?/);
        if (methodMatch) {
            result.method = methodMatch[1] || methodMatch[2];
        }

        // Ищем заголовки
        const headerMatches = cleanCommand.matchAll(/-H\s+['"]([^'"]+)['"]|--header\s+['"]([^'"]+)['"]/g);
        for (const match of headerMatches) {
            const headerStr = match[1] || match[2];
            const colonIndex = headerStr.indexOf(':');
            if (colonIndex > -1) {
                const name = headerStr.slice(0, colonIndex).trim();
                const value = headerStr.slice(colonIndex + 1).trim();
                result.headers[name] = value;
            }
        }

        // Ищем cookies
        const cookieMatches = cleanCommand.match(/-b\s+['"]([^'"]+)['"]/);
        if (cookieMatches) {
            const cookies = cookieMatches[1].split(';');
            cookies.forEach(cookie => {
                const [name, ...valueParts] = cookie.trim().split('=');
                result.cookies[name] = valueParts.join('=');
            });
        }

        // Ищем тело запроса
        let dataMatch = cleanCommand.match(/--data-raw\s+['"](.+?)['"]/);
        if (!dataMatch) {
            dataMatch = cleanCommand.match(/--data\s+['"](.+?)['"]/);
        }
        if (!dataMatch) {
            dataMatch = cleanCommand.match(/-d\s+['"](.+?)['"]/);
        }

        if (dataMatch) {
            // Если есть тело запроса, это автоматически означает POST метод,
            // если метод не был явно указан через -X или --request
            if (!methodMatch) {
                result.method = 'POST';
            }

            try {
                // Пробуем распарсить как JSON
                result.body = JSON.parse(dataMatch[1]);
            } catch {
                // Если не получилось распарсить как JSON, оставляем как есть
                result.body = dataMatch[1];
            }
        }

        return result;
    }

    // Обработка нажатия на кнопку Parse
    parseCurlButton.addEventListener('click', () => {
        const curlCommand = curlInput.value.trim();
        if (!curlCommand) {
            showNotification('Введите cURL запрос', 'error');
            return;
        }

        try {
            const parsed = parseCurlCommand(curlCommand);
            
            // Отображаем метод
            const methodBadge = document.getElementById('requestMethodBadge');
            methodBadge.textContent = parsed.method;
            methodBadge.className = `method-badge method-${parsed.method}`;
            
            // Отображаем URL
            document.getElementById('requestUrlDisplay').textContent = parsed.url;
            
            // Отображаем тело запроса
            const requestBodyEditor = document.getElementById('requestBodyEditor');
            if (parsed.body) {
                if (typeof parsed.body === 'object') {
                    requestBodyEditor.value = JSON.stringify(parsed.body, null, 2);
                } else {
                    requestBodyEditor.value = parsed.body;
                }
            } else {
                requestBodyEditor.value = '';
            }
            
            // Сохраняем данные для отправки
            requestBodyEditor.dataset.originalMethod = parsed.method;
            requestBodyEditor.dataset.originalUrl = parsed.url;
            requestBodyEditor.dataset.originalHeaders = JSON.stringify(parsed.headers);
            
            // Показываем секцию с распарсенным запросом
            parsedCurlSection.style.display = 'block';
            // Скрываем секцию ответа если она была открыта
            responseSection.style.display = 'none';
            
            showNotification('cURL запрос успешно распарсен', 'success');
        } catch (error) {
            showNotification('Ошибка парсинга cURL: ' + error.message, 'error');
        }
    });

    // Отправка запроса
    sendCurlRequest.addEventListener('click', async () => {
        const requestBodyEditor = document.getElementById('requestBodyEditor');
        const spinner = document.getElementById('sendSpinner');
        
        try {
            const method = requestBodyEditor.dataset.originalMethod;
            const url = requestBodyEditor.dataset.originalUrl;
            const headers = JSON.parse(requestBodyEditor.dataset.originalHeaders);
            let body = requestBodyEditor.value.trim();
            
            if (body) {
                try {
                    body = JSON.parse(body);
                } catch {
                    // Если не удалось распарсить как JSON, отправляем как есть
                }
            }

            spinner.classList.add('visible');
            responseSection.style.display = 'none';
            
            const startTime = Date.now();
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                credentials: 'include' // Для отправки cookies
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Получаем тело ответа
            let responseText = '';
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                const jsonResponse = await response.json();
                responseText = JSON.stringify(jsonResponse, null, 2);
            } else {
                responseText = await response.text();
            }
            
            // Обновляем интерфейс
            const statusEl = document.getElementById('responseStatus');
            statusEl.textContent = `${response.status} ${response.statusText}`;
            statusEl.className = response.ok ? 'success' : 'error';
            
            document.getElementById('responseTime').textContent = `${duration}ms`;
            document.getElementById('responseBody').textContent = responseText;
            
            responseSection.style.display = 'block';
        } catch (error) {
            showNotification('Ошибка отправки запроса: ' + error.message, 'error');
        } finally {
            spinner.classList.remove('visible');
        }
    });

    // Обработка Ctrl+Enter для быстрой отправки
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && curlSenderModal.style.display === 'block') {
            sendCurlRequest.click();
        }
    });

    const beautifyJsonBtn = document.getElementById('beautifyJson');
    
    beautifyJsonBtn.addEventListener('click', () => {
        const editor = document.getElementById('requestBodyEditor');
        const text = editor.value.trim();
        
        if (!text) return;
        
        try {
            // Пробуем распарсить как JSON
            const json = JSON.parse(text);
            // Форматируем с отступами
            editor.value = JSON.stringify(json, null, 2);
            showNotification('JSON отформатирован', 'success');
        } catch (error) {
            showNotification('Ошибка: Невалидный JSON', 'error');
        }
    });
});