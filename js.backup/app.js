// Main application logic and DOM manipulation

// DOM elements - Fixed to match HTML IDs
const taskForm = document.getElementById('task-form');
const taskTitle = document.getElementById('task-title');
const taskProject = document.getElementById('task-project');
const taskDescription = document.getElementById('task-description');
const taskPriority = document.getElementById('task-priority');
const taskList = document.getElementById('task-list');
const currentTaskTitle = document.getElementById('current-task-title');
const currentTaskTime = document.getElementById('current-task-time');
const currentTaskProject = document.getElementById('current-task-project');
const completedTasksList = document.getElementById('completed-tasks-list');
const historyList = document.getElementById('task-history');

// Autocomplete variables
let autocompleteContainer = null;
let filteredSuggestions = [];
let currentSuggestionIndex = -1;

// Initialize application
function init() {
    loadData();
    checkDailyReset();
    cleanupDeletedTasks();
    renderTaskList();
    renderTaskHistory();
    updateDashboard();
    setupFilters();
    setupEventListeners();
    
    // Update smart sort toggle
    const smartSortToggle = document.getElementById('sort-toggle');
    if (smartSortToggle) {
        smartSortToggle.checked = smartSortEnabled;
    }
}

// Cleanup old deleted tasks (older than 30 days)
function cleanupDeletedTasks() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    deletedTasks = deletedTasks.filter(task => {
        return new Date(task.deletedAt) > thirtyDaysAgo;
    });
}

// Event listeners setup
function setupEventListeners() {
    // Task form submission
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addNewTask();
        });
    }
    
    // Completed tasks toggle
    const toggleCompletedBtn = document.getElementById('completed-stat-card');
    if (toggleCompletedBtn) {
        toggleCompletedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleCompletedTasks();
        });
    }
    
    // Daily reset button
    const resetDailyIconBtn = document.getElementById('reset-daily-time-icon');
    if (resetDailyIconBtn) {
        resetDailyIconBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Reset daily time for all tasks? This will save current progress to history.')) {
                resetDailyTime();
            }
        });
    }
    
    // Smart sort toggle
    const smartSortToggle = document.getElementById('sort-toggle');
    if (smartSortToggle) {
        smartSortToggle.addEventListener('click', (e) => {
            smartSortEnabled = !smartSortEnabled;
            renderTaskList();
            saveData();
        });
    }
    
    // Filter button
    const filterBtn = document.getElementById('filter-btn');
    const filterContent = document.getElementById('filter-content');
    
    if (filterBtn && filterContent) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            filterContent.style.display = filterContent.style.display === 'block' ? 'none' : 'block';
        });
    }
    
    // Export/Import buttons
    const exportBtn = document.getElementById('export-data');
    const importBtn = document.getElementById('import-data');
    const importFile = document.getElementById('import-file');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exportData();
        });
    }
    
    if (importBtn && importFile) {
        importBtn.addEventListener('click', (e) => {
            e.preventDefault();
            importFile.click();
        });
        
        importFile.addEventListener('change', importData);
    }
    
    // Filter controls
    const applyFiltersBtn = document.getElementById('apply-filters');
    const clearFiltersBtn = document.getElementById('clear-filters');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearFilters();
        });
    }
    
    // Close filter menu when clicking outside
    document.addEventListener('click', (e) => {
        if (filterContent && !filterBtn.contains(e.target) && !filterContent.contains(e.target)) {
            filterContent.style.display = 'none';
        }
    });
    
    // Project autocomplete setup
    setupProjectAutocomplete();
}

// Project autocomplete functionality
function setupProjectAutocomplete() {
    // Get project suggestions
    function getProjectSuggestions(input) {
        const projects = [...new Set(tasks.map(task => task.project).filter(p => p))];
        return projects.filter(project => 
            project.toLowerCase().includes(input.toLowerCase())
        ).slice(0, 5);
    }
    
    // Show autocomplete suggestions
    function showAutocompleteSuggestions(suggestions) {
        hideAutocomplete();
        
        if (suggestions.length === 0) return;
        
        autocompleteContainer = document.createElement('div');
        autocompleteContainer.className = 'autocomplete-suggestions';
        
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = suggestion;
            item.addEventListener('click', () => acceptSuggestion(suggestion));
            autocompleteContainer.appendChild(item);
        });
        
        taskProject.parentNode.appendChild(autocompleteContainer);
        filteredSuggestions = suggestions;
        currentSuggestionIndex = -1;
    }
    
    // Hide autocomplete
    function hideAutocomplete() {
        if (autocompleteContainer) {
            autocompleteContainer.remove();
            autocompleteContainer = null;
        }
        filteredSuggestions = [];
        currentSuggestionIndex = -1;
    }
    
    // Highlight suggestion
    function highlightSuggestion(index) {
        if (!autocompleteContainer) return;
        
        const items = autocompleteContainer.querySelectorAll('.autocomplete-item');
        items.forEach((item, i) => {
            item.classList.toggle('highlighted', i === index);
        });
    }
    
    // Clear suggestion highlight
    function clearSuggestionHighlight() {
        if (!autocompleteContainer) return;
        
        const items = autocompleteContainer.querySelectorAll('.autocomplete-item');
        items.forEach(item => item.classList.remove('highlighted'));
    }
    
    // Accept suggestion
    function acceptSuggestion(suggestion) {
        taskProject.value = suggestion;
        hideAutocomplete();
        taskProject.focus();
    }
    
    // Event listeners for autocomplete
    taskProject.addEventListener('input', (e) => {
        const input = e.target.value.trim();
        const suggestions = getProjectSuggestions(input);
        
        if (input.length > 0 && suggestions.length > 0) {
            showAutocompleteSuggestions(suggestions);
        } else {
            hideAutocomplete();
        }
    });
    
    taskProject.addEventListener('keydown', (e) => {
        if (!autocompleteContainer || autocompleteContainer.style.display === 'none') {
            return;
        }
        
        switch (e.key) {
            case 'Tab':
                e.preventDefault();
                if (currentSuggestionIndex >= 0 && currentSuggestionIndex < filteredSuggestions.length) {
                    acceptSuggestion(filteredSuggestions[currentSuggestionIndex]);
                } else if (filteredSuggestions.length > 0) {
                    acceptSuggestion(filteredSuggestions[0]);
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, filteredSuggestions.length - 1);
                highlightSuggestion(currentSuggestionIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
                if (currentSuggestionIndex >= 0) {
                    highlightSuggestion(currentSuggestionIndex);
                } else {
                    clearSuggestionHighlight();
                }
                break;
                
            case 'Enter':
                if (currentSuggestionIndex >= 0 && currentSuggestionIndex < filteredSuggestions.length) {
                    e.preventDefault();
                    acceptSuggestion(filteredSuggestions[currentSuggestionIndex]);
                }
                break;
                
            case 'Escape':
                hideAutocomplete();
                break;
        }
    });
    
    taskProject.addEventListener('focus', (e) => {
        const input = e.target.value.trim();
        const suggestions = getProjectSuggestions(input);
        
        if (suggestions.length > 0) {
            showAutocompleteSuggestions(suggestions);
        }
    });
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!taskProject.contains(e.target) && (!autocompleteContainer || !autocompleteContainer.contains(e.target))) {
            hideAutocomplete();
        }
    });
}

// Rendering functions
function renderTaskList() {
    const filteredTasks = getFilteredTasks();
    const sortedTasks = smartSort([...filteredTasks]);
    
    taskList.innerHTML = '';
    
    if (sortedTasks.length === 0) {
        taskList.innerHTML = '<div class="empty-state">No tasks found. Add a new task to get started!</div>';
        return;
    }
    
    sortedTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
    });
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item ${task.status}`;
    taskDiv.innerHTML = `
        <div class="task-content">
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <div class="task-meta">
                    ${task.project ? `<span class="project-tag">${task.project}</span>` : ''}
                    <span class="priority-${task.priority}">${task.priority}</span>
                </div>
            </div>
            ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
            <div class="task-stats">
                <span class="time-spent">Today: ${formatTime(task.dailyTimeSpent)}</span>
                <span class="total-time">Total: ${formatTime(task.totalTimeSpent)}</span>
                <span class="status-text">${formatStatusText(task.status)}</span>
            </div>
        </div>
        <div class="task-actions">
            ${generateActionButtons(task)}
            <button onclick="openEditModal(${task.id})" class="btn btn-sm edit-btn" title="Edit Task">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteTask(${task.id})" class="btn btn-sm btn-danger delete-btn" title="Delete Task">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return taskDiv;
}

function generateActionButtons(task) {
    switch (task.status) {
        case 'not-started':
            return `<button onclick="startTask(${task.id})" class="btn btn-sm start-btn" title="Start Task">
                        <i class="fas fa-play"></i> Start
                    </button>`;
        case 'in-progress':
            return `<button onclick="pauseTask(${task.id})" class="btn btn-sm btn-warning pause-btn" title="Pause Task">
                        <i class="fas fa-pause"></i> Pause
                    </button>
                    <button onclick="completeTask(${task.id})" class="btn btn-sm btn-success complete-btn" title="Complete Task">
                        <i class="fas fa-check"></i> Complete
                    </button>`;
        case 'paused':
            return `<button onclick="resumeTask(${task.id})" class="btn btn-sm resume-btn" title="Resume Task">
                        <i class="fas fa-play"></i> Resume
                    </button>
                    <button onclick="cancelTask(${task.id})" class="btn btn-sm btn-danger cancel-btn" title="Cancel Task">
                        <i class="fas fa-times"></i> Cancel
                    </button>`;
        case 'completed':
            return `<button onclick="restartTask(${task.id})" class="btn btn-sm restart-btn" title="Restart Task">
                        <i class="fas fa-redo"></i> Restart
                    </button>`;
        case 'cancelled':
            return `<button onclick="restartTask(${task.id})" class="btn btn-sm restart-btn" title="Restart Task">
                        <i class="fas fa-redo"></i> Restart
                    </button>`;
        default:
            return '';
    }
}

function renderTaskHistory() {
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No recent activity</div>';
        return;
    }
    
    history.slice(0, 10).forEach(entry => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const restoreButton = entry.isRestorable ? 
            `<button onclick="restoreTask(${entry.taskId})" class="btn-restore" title="Restore Task">
                <i class="fas fa-undo"></i>
            </button>` : '';
        
        historyItem.innerHTML = `
            <div class="history-content">
                <span class="history-task">${entry.taskTitle}</span>
                <span class="history-action">${entry.action}</span>
                <span class="history-time">${formatSmartTimestamp(entry.timestamp)}</span>
            </div>
            ${restoreButton}
        `;
        
        historyList.appendChild(historyItem);
    });
}

function toggleCompletedTasks() {
    completedTasksVisible = !completedTasksVisible;
    const toggleBtn = document.getElementById('toggleCompleted');
    const completedSection = document.getElementById('completedTasks');
    
    if (completedTasksVisible) {
        renderCompletedTasks();
        completedSection.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Completed';
    } else {
        completedSection.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Show Completed';
    }
}

function renderCompletedTasks() {
    const completedTasks = tasks.filter(task => task.status === 'completed');
    completedTasksList.innerHTML = '';
    
    if (completedTasks.length === 0) {
        completedTasksList.innerHTML = '<div class="empty-state">No completed tasks</div>';
        return;
    }
    
    completedTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        completedTasksList.appendChild(taskElement);
    });
}

// Missing utility functions
function updateDashboard() {
    // Update active tasks count
    const activeCount = tasks.filter(task => 
        task.status === 'in-progress' || task.status === 'paused' || task.status === 'not-started'
    ).length;
    const activeCountEl = document.getElementById('active-count');
    if (activeCountEl) activeCountEl.textContent = activeCount;
    
    // Update completed tasks count (today only)
    const today = new Date().toDateString();
    const completedToday = tasks.filter(task => 
        task.status === 'completed' && 
        new Date(task.lastUpdated).toDateString() === today
    ).length;
    const completedCountEl = document.getElementById('completed-count');
    if (completedCountEl) completedCountEl.textContent = completedToday;
    
    // Update time tracked today
    const totalTimeToday = tasks.reduce((total, task) => total + (task.dailyTimeSpent || 0), 0);
    const timeTrackedEl = document.getElementById('time-tracked');
    if (timeTrackedEl) timeTrackedEl.textContent = formatTime(totalTimeToday);
    
    // Update current task display
    const currentTask = tasks.find(task => task.status === 'in-progress');
    const currentTaskTitleEl = document.getElementById('current-task-title');
    const currentTaskTimeEl = document.getElementById('current-task-time');
    const currentTaskProjectEl = document.getElementById('current-task-project');
    
    if (currentTask) {
        if (currentTaskTitleEl) currentTaskTitleEl.textContent = currentTask.title;
        if (currentTaskTimeEl) currentTaskTimeEl.textContent = formatTime(currentTask.dailyTimeSpent || 0);
        if (currentTaskProjectEl) currentTaskProjectEl.textContent = currentTask.project || 'None';
    } else {
        if (currentTaskTitleEl) currentTaskTitleEl.textContent = 'No active task';
        if (currentTaskTimeEl) currentTaskTimeEl.textContent = '0m';
        if (currentTaskProjectEl) currentTaskProjectEl.textContent = 'None';
    }
}

function formatTime(minutes) {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatStatusText(status) {
    const statusMap = {
        'not-started': 'Not Started',
        'in-progress': 'In Progress',
        'paused': 'Paused',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

function generateActionButtons(task) {
    switch (task.status) {
        case 'not-started':
            return `<button onclick="startTask(${task.id})" class="btn-start" title="Start Task">
                        <i class="fas fa-play"></i>
                    </button>`;
        case 'in-progress':
            return `<button onclick="pauseTask(${task.id})" class="btn-pause" title="Pause Task">
                        <i class="fas fa-pause"></i>
                    </button>
                    <button onclick="completeTask(${task.id})" class="btn-complete" title="Complete Task">
                        <i class="fas fa-check"></i>
                    </button>`;
        case 'paused':
            return `<button onclick="resumeTask(${task.id})" class="btn-resume" title="Resume Task">
                        <i class="fas fa-play"></i>
                    </button>
                    <button onclick="completeTask(${task.id})" class="btn-complete" title="Complete Task">
                        <i class="fas fa-check"></i>
                    </button>`;
        case 'completed':
            return `<button onclick="restartTask(${task.id})" class="btn-restart" title="Restart Task">
                        <i class="fas fa-redo"></i>
                    </button>`;
        default:
            return '';
    }
}

function addToHistory(task, action, isRestorable = false) {
    const historyEntry = {
        id: Date.now(),
        taskId: task.id,
        taskTitle: task.title,
        action: action,
        timestamp: new Date(),
        isRestorable: isRestorable
    };
    
    history.unshift(historyEntry);
    
    // Keep only last 50 history entries
    if (history.length > 50) {
        history = history.slice(0, 50);
    }
    
    renderTaskHistory();
}

function formatSmartTimestamp(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return time.toLocaleDateString();
}

function checkDailyReset() {
    const today = new Date().toDateString();
    
    tasks.forEach(task => {
        if (!task.lastResetDate || task.lastResetDate !== today) {
            // Save yesterday's time to history
            if (task.dailyTimeSpent > 0) {
                if (!task.timeHistory) task.timeHistory = [];
                task.timeHistory.push({
                    date: task.lastResetDate || new Date(Date.now() - 86400000).toDateString(),
                    timeSpent: task.dailyTimeSpent
                });
            }
            
            // Reset daily time
            task.dailyTimeSpent = 0;
            task.lastResetDate = today;
        }
    });
}

function openEditModal(taskId) {
    // Simple edit functionality - you can enhance this
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newTitle = prompt('Edit task title:', task.title);
    if (newTitle && newTitle.trim()) {
        task.title = newTitle.trim();
        task.lastUpdated = new Date();
        addToHistory(task, 'edited');
        renderTaskList();
        saveData();
    }
}

// Simulate time tracking - Add this at the end of the file
setInterval(() => {
    // Check for daily reset first
    checkDailyReset();
    
    let updated = false;
    tasks.forEach(task => {
        if (task.status === 'in-progress') {
            task.dailyTimeSpent += 1;
            task.totalTimeSpent += 1;
            
            // Update legacy field for backward compatibility
            task.timeSpent = task.dailyTimeSpent;
            
            updated = true;
        }
    });
    
    if (updated) {
        renderTaskList();
        updateDashboard();
        
        const activeTask = tasks.find(task => task.status === 'in-progress');
        if (activeTask) {
            const currentTaskTimeEl = document.getElementById('current-task-time');
            if (currentTaskTimeEl) {
                currentTaskTimeEl.textContent = formatTime(activeTask.dailyTimeSpent);
            }
        }
        
        saveData();
    }
}, 60000); // Update every minute

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);