// Task management functions

// Add new task
function addNewTask() {
    const title = taskTitle.value.trim();
    const project = taskProject.value.trim();
    const description = taskDescription.value.trim();
    const priority = taskPriority.value;
    
    if (!title) return;
    
    const newTask = {
        id: Date.now(),
        title,
        project: project || '',
        description,
        status: 'not-started',
        priority,
        timeSpent: 0, // Legacy field for backward compatibility
        dailyTimeSpent: 0, // Time spent today
        totalTimeSpent: 0, // All-time total
        timeHistory: [], // Array of {date, timeSpent} objects
        lastUpdated: new Date(),
        lastResetDate: new Date().toDateString() // Track when daily time was last reset
    };
    
    tasks.unshift(newTask);
    renderTaskList();
    updateDashboard();
    setupFilters();
    saveData();
    
    taskForm.reset();
}

// Task action handlers
function startTask(taskId) {
    // Auto-pause other tasks
    tasks.forEach(task => {
        if (task.status === 'in-progress' && task.id !== taskId) {
            task.status = 'paused';
            task.lastUpdated = new Date();
            addToHistory(task, 'auto-paused');
        }
    });
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = 'in-progress';
        task.lastUpdated = new Date();
        addToHistory(task, 'started');
        renderTaskList();
        updateDashboard();
        saveData();
    }
}

function pauseTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = 'paused';
        task.lastUpdated = new Date();
        addToHistory(task, 'paused');
        renderTaskList();
        updateDashboard();
        saveData();
    }
}

function resumeTask(taskId) {
    // Auto-pause other tasks
    tasks.forEach(task => {
        if (task.status === 'in-progress' && task.id !== taskId) {
            task.status = 'paused';
            task.lastUpdated = new Date();
            addToHistory(task, 'auto-paused');
        }
    });
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = 'in-progress';
        task.lastUpdated = new Date();
        addToHistory(task, 'resumed');
        renderTaskList();
        updateDashboard();
        saveData();
    }
}

function completeTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = 'completed';
        task.lastUpdated = new Date();
        addToHistory(task, 'completed');
        renderTaskList();
        updateDashboard();
        saveData();
    }
}

function restartTask(taskId) {
    // Auto-pause other tasks
    tasks.forEach(task => {
        if (task.status === 'in-progress' && task.id !== taskId) {
            task.status = 'paused';
            task.lastUpdated = new Date();
            addToHistory(task, 'auto-paused');
        }
    });
    
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = 'in-progress';
        task.timeSpent = 0;
        task.dailyTimeSpent = 0;
        task.lastUpdated = new Date();
        addToHistory(task, 'restarted');
        renderTaskList();
        updateDashboard();
        saveData();
    }
}

function cancelTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = 'not-started';
        task.lastUpdated = new Date();
        addToHistory(task, 'cancelled');
        renderTaskList();
        updateDashboard();
        saveData();
    }
}

function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const task = tasks[taskIndex];
    
    // Add to deleted tasks with metadata
    const deletedTask = {
        ...task,
        deletedAt: new Date(),
        originalIndex: taskIndex
    };
    
    deletedTasks.unshift(deletedTask);
    
    // Keep only last 50 deleted tasks
    if (deletedTasks.length > 50) {
        deletedTasks = deletedTasks.slice(0, 50);
    }
    
    // Remove from tasks array
    tasks.splice(taskIndex, 1);
    
    // Add to history with restore option
    addToHistory(task, 'deleted', true);
    
    renderTaskList();
    renderTaskHistory();
    updateDashboard();
    setupFilters();
    
    if (completedTasksVisible) {
        renderCompletedTasks();
    }
    
    saveData();
}

function restoreTask(taskId) {
    const deletedTaskIndex = deletedTasks.findIndex(t => t.id === taskId);
    if (deletedTaskIndex === -1) return;
    
    const taskToRestore = deletedTasks[deletedTaskIndex];
    
    // Remove deletion timestamp and restore to tasks array
    const { deletedAt, originalIndex, ...restoredTask } = taskToRestore;
    
    // Add back to tasks array
    tasks.unshift(restoredTask);
    
    // Remove from deleted tasks
    deletedTasks.splice(deletedTaskIndex, 1);
    
    // Update history to show restore action
    addToHistory(restoredTask, 'restored');
    
    // Remove the delete entry from history and mark as non-restorable
    const deleteHistoryIndex = history.findIndex(h => h.taskId === taskId && h.action === 'deleted');
    if (deleteHistoryIndex !== -1) {
        history[deleteHistoryIndex].isRestorable = false;
    }
    
    // Re-render everything
    renderTaskList();
    renderTaskHistory();
    updateDashboard();
    setupFilters();
    
    if (completedTasksVisible) {
        renderCompletedTasks();
    }
    
    saveData();
}

// Time management functions
function checkDailyReset() {
    const today = new Date().toDateString();
    
    tasks.forEach(task => {
        // Migrate legacy tasks
        if (!task.hasOwnProperty('dailyTimeSpent')) {
            task.dailyTimeSpent = task.timeSpent || 0;
            task.totalTimeSpent = task.timeSpent || 0;
            task.timeHistory = [];
            task.lastResetDate = today;
        }
        
        // Check if we need to reset daily time
        if (task.lastResetDate !== today) {
            // Save yesterday's time to history if there was any
            if (task.dailyTimeSpent > 0) {
                task.timeHistory.push({
                    date: task.lastResetDate,
                    timeSpent: task.dailyTimeSpent
                });
                
                // Keep only last 30 days of history
                if (task.timeHistory.length > 30) {
                    task.timeHistory = task.timeHistory.slice(-30);
                }
            }
            
            // Reset daily time
            task.dailyTimeSpent = 0;
            task.lastResetDate = today;
            
            // Update legacy timeSpent field for backward compatibility
            task.timeSpent = task.dailyTimeSpent;
        }
    });
}

function resetDailyTime(taskId = null) {
    const today = new Date().toDateString();
    const tasksToReset = taskId ? [tasks.find(t => t.id === taskId)] : tasks;
    
    tasksToReset.forEach(task => {
        if (!task) return;
        
        // Save current daily time to history if there's any
        if (task.dailyTimeSpent > 0) {
            task.timeHistory.push({
                date: today,
                timeSpent: task.dailyTimeSpent
            });
            
            // Keep only last 30 days
            if (task.timeHistory.length > 30) {
                task.timeHistory = task.timeHistory.slice(-30);
            }
        }
        
        // Reset daily time
        task.dailyTimeSpent = 0;
        task.lastResetDate = today;
        
        // Update legacy field
        task.timeSpent = task.dailyTimeSpent;
    });
    
    renderTaskList();
    updateDashboard();
    saveData();
    
    const message = taskId ? 'Task daily time reset successfully!' : 'All daily times reset successfully!';
    alert(message);
}

// Handle task actions from button clicks
function handleTaskAction(e) {
    const button = e.target.closest('.btn');
    if (!button) return;
    
    const taskId = parseInt(button.dataset.id);
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    e.preventDefault();
    
    if (button.classList.contains('start-btn')) {
        startTask(taskId);
    } else if (button.classList.contains('pause-btn')) {
        pauseTask(taskId);
    } else if (button.classList.contains('resume-btn')) {
        resumeTask(taskId);
    } else if (button.classList.contains('complete-btn')) {
        completeTask(taskId);
    } else if (button.classList.contains('restart-btn')) {
        restartTask(taskId);
    } else if (button.classList.contains('cancel-btn')) {
        cancelTask(taskId);
    } else if (button.classList.contains('delete-btn')) {
        deleteTask(taskId);
    }
}