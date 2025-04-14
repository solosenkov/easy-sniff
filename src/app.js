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
    function viewRequest(request) {
        console.log('Детали запроса:', request);
        // Здесь будет реализована функциональность просмотра деталей
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
            // Шаг 1: Пробуем простое base64 декодирование
            const simpleDecoded = base64Decode(encodedMessage);
            
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
});