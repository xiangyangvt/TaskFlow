// Data persistence and management
let tasks = [];
let deletedTasks = [];
let history = [];
let completedTasksVisible = false;
// Filter state
let filterState = {
    statuses: ['not-started', 'in-progress', 'paused', 'completed'],
    projects: []
};
let smartSortEnabled = true;

// Save data to localStorage
function saveData() {
    const data = {
        tasks,
        deletedTasks,
        history,
        smartSortEnabled,
        version: '2.0'
    };
    localStorage.setItem('taskFlowData', JSON.stringify(data));
}

// Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('taskFlowData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            tasks = data.tasks || [];
            deletedTasks = data.deletedTasks || [];
            history = data.history || [];
            smartSortEnabled = data.smartSortEnabled !== undefined ? data.smartSortEnabled : true;
            
            // Migrate legacy data
            tasks.forEach(task => {
                if (!task.hasOwnProperty('dailyTimeSpent')) {
                    task.dailyTimeSpent = task.timeSpent || 0;
                    task.totalTimeSpent = task.timeSpent || 0;
                    task.timeHistory = [];
                    task.lastResetDate = new Date().toDateString();
                }
            });
        } catch (e) {
            console.error('Error loading data:', e);
        }
    }
}

// Export data
function exportData() {
    const data = {
        tasks,
        deletedTasks,
        history,
        smartSortEnabled,
        exportDate: new Date().toISOString(),
        version: '2.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Import data
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (confirm('This will merge the imported data with your current data. Continue?')) {
                // Smart merge: avoid duplicates based on task ID and title
                const existingTaskIds = new Set(tasks.map(t => t.id));
                const existingTaskTitles = new Set(tasks.map(t => t.title.toLowerCase()));
                
                const newTasks = importedData.tasks?.filter(task => 
                    !existingTaskIds.has(task.id) && 
                    !existingTaskTitles.has(task.title.toLowerCase())
                ) || [];
                
                tasks = [...tasks, ...newTasks];
                
                // Merge deleted tasks
                const existingDeletedIds = new Set(deletedTasks.map(t => t.id));
                const newDeletedTasks = importedData.deletedTasks?.filter(task => 
                    !existingDeletedIds.has(task.id)
                ) || [];
                
                deletedTasks = [...deletedTasks, ...newDeletedTasks];
                
                // Merge history (keep recent entries)
                const newHistory = importedData.history || [];
                history = [...history, ...newHistory].slice(-50); // Keep last 50 entries
                
                if (importedData.smartSortEnabled !== undefined) {
                    smartSortEnabled = importedData.smartSortEnabled;
                }
                
                renderTaskList();
                renderTaskHistory();
                updateDashboard();
                setupFilters();
                saveData();
                
                alert(`Successfully imported ${newTasks.length} new tasks!`);
            }
        } catch (error) {
            alert('Error importing file. Please make sure it\'s a valid TaskFlow backup file.');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}