// Main application logic and DOM manipulation

// DOM elements
const taskForm = document.getElementById('taskForm');
const taskTitle = document.getElementById('taskTitle');
const taskProject = document.getElementById('taskProject');
const taskDescription = document.getElementById('taskDescription');
const taskPriority = document.getElementById('taskPriority');
const taskList = document.getElementById('taskList');
const completedTasksList = document.getElementById('completedTasksList');
const historyList = document.getElementById('historyList');
const currentTaskTitle = document.getElementById('currentTaskTitle');
const currentTaskTime = document.getElementById('currentTaskTime');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editTaskId = document.getElementById('editTaskId');
const editTaskTitle = document.getElementById('editTaskTitle');
const editTaskProject = document.getElementById('editTaskProject');
const editTaskDescription = document.getElementById('editTaskDescription');
const editTaskPriority = document.getElementById('editTaskPriority');

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
    const smartSortToggle = document.getElementById('smartSortToggle');
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
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addNewTask();
    });
    
    // Completed tasks toggle
    const toggleCompletedBtn = document.getElementById('toggleCompleted');
    if (toggleCompletedBtn) {
        toggleCompletedBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleCompletedTasks();
        });
    }
    
    // Edit modal handlers
    const closeEditBtn = document.querySelector('.close-edit');
    if (closeEditBtn) {
        closeEditBtn.addEventListener('click', () => {
            editModal.style.display = 'none';
        });
    }
    
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTaskEdit();
    });
    
    // Daily reset button
    const resetDailyBtn = document.getElementById('resetDailyTime');
    if (resetDailyBtn) {
        resetDailyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Reset daily time for all tasks? This will save current progress to history.')) {
                resetDailyTime();
            }
        });
    }
    
    // Smart sort toggle
    const smartSortToggle = document.getElementById('smartSortToggle');
    if (smartSortToggle) {
        smartSortToggle.addEventListener('change', (e) => {
            smartSortEnabled = e.target.checked;
            renderTaskList();
            saveData();
        });
    }
    
    // Filter and data menu toggles
    const filterMenuBtn = document.getElementById('filterMenuBtn');
    const dataMenuBtn = document.getElementById('dataMenuBtn');
    const filterMenu = document.getElementById('filterMenu');
    const dataMenu = document.getElementById('dataMenu');
    
    if (filterMenuBtn && filterMenu) {
        filterMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            filterMenu.style.display = filterMenu.style.display === 'block' ? 'none' : 'block';
            if (dataMenu) dataMenu.style.display = 'none';
        });
    }
    
    if (dataMenuBtn && dataMenu) {
        dataMenuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            dataMenu.style.display = dataMenu.style.display === 'block' ? 'none' : 'block';
            if (filterMenu) filterMenu.style.display = 'none';
        });
    }
    
    // Export/Import buttons
    const exportBtn = document.getElementById('exportData');
    const importBtn = document.getElementById('importData');
    const importFile = document.getElementById('importFile');
    
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
    const statusFilter = document.getElementById('statusFilter');
    const projectFilter = document.getElementById('projectFilter');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    if (projectFilter) {
        projectFilter.addEventListener('change', applyFilters);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearFilters();
        });
    }
    
    // Close menus when clicking outside
    document.addEventListener('click', (e) => {
        if (filterMenu && !filterMenuBtn.contains(e.target) && !filterMenu.contains(e.target)) {
            filterMenu.style.display = 'none';
        }
        if (dataMenu && !dataMenuBtn.contains(e.target) && !dataMenu.contains(e.target)) {
            dataMenu.style.display = 'none';
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
            <button onclick="openEditModal(${task.id})" class="btn-edit" title="Edit Task">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteTask(${task.id})" class="btn-delete" title="Delete Task">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return taskDiv;
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
        case 'cancelled':
            return `<button onclick="restartTask(${task.id})" class="btn-restart" title="Restart Task">
                        <i class="fas fa-redo"></i>
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

function updateDashboard() {
    // Update task counts
    const totalTasks = tasks.length;
    const activeTasks = tasks.filter(t => t.status === 'in-progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => ['not-started', 'paused'].includes(t.status)).length;
    
    // Update dashboard stats
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('activeTasks').textContent = activeTasks;
    document.getElementById('completedTasks').textContent = completedTasks;
    document.getElementById('pendingTasks').textContent = pendingTasks;
    
    // Update daily time
    const totalDailyTime = tasks.reduce((sum, task) => sum + (task.dailyTimeSpent || 0), 0);
    document.getElementById('dailyTime').textContent = formatTime(totalDailyTime);
    
    // Update active task display
    const activeTask = tasks.find(task => task.status === 'in-progress');
    if (activeTask) {
        currentTaskTitle.textContent = activeTask.title;
        currentTaskTime.textContent = formatTime(activeTask.dailyTimeSpent);
        document.getElementById('activeTaskDisplay').style.display = 'block';
    } else {
        document.getElementById('activeTaskDisplay').style.display = 'none';
    }
    
    // Adjust column heights for desktop
    adjustColumnHeights();
}

function adjustColumnHeights() {
    if (window.innerWidth > 768) {
        const leftColumn = document.querySelector('.left-column');
        const rightColumn = document.querySelector('.right-column');
        
        if (leftColumn && rightColumn) {
            leftColumn.style.height = 'auto';
            rightColumn.style.height = 'auto';
            
            const leftHeight = leftColumn.offsetHeight;
            const rightHeight = rightColumn.offsetHeight;
            const maxHeight = Math.max(leftHeight, rightHeight);
            
            leftColumn.style.height = maxHeight + 'px';
            rightColumn.style.height = maxHeight + 'px';
        }
    }
}

// Edit modal functions
function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    editTaskId.value = task.id;
    editTaskTitle.value = task.title;
    editTaskProject.value = task.project;
    editTaskDescription.value = task.description;
    editTaskPriority.value = task.priority;
    
    editModal.style.display = 'block';
}

function saveTaskEdit() {
    const taskId = parseInt(editTaskId.value);
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        task.title = editTaskTitle.value.trim();
        task.project = editTaskProject.value.trim();
        task.description = editTaskDescription.value.trim();
        task.priority = editTaskPriority.value;
        task.lastUpdated = new Date();
        
        addToHistory(task, 'updated');
        renderTaskList();
        renderTaskHistory();
        updateDashboard();
        setupFilters();
        saveData();
        
        editModal.style.display = 'none';
    }
}

// Utility functions
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
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

function formatSmartTimestamp(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return time.toLocaleDateString();
}

function addToHistory(task, action, isRestorable = false) {
    const historyEntry = {
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
}

// Time tracking interval
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
            currentTaskTime.textContent = formatTime(activeTask.dailyTimeSpent);
        }
        
        saveData();
    }
}, 60000);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);