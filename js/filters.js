// Filter and sorting functionality
function setupFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const projectFilter = document.getElementById('projectFilter');
    
    // Clear existing options (keep "All" options)
    statusFilter.innerHTML = '<option value="all">All Status</option>';
    projectFilter.innerHTML = '<option value="all">All Projects</option>';
    
    // Get unique statuses and projects
    const statuses = [...new Set(tasks.map(task => task.status))];
    const projects = [...new Set(tasks.map(task => task.project).filter(p => p))];
    
    // Populate status filter
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
        statusFilter.appendChild(option);
    });
    
    // Populate project filter
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectFilter.appendChild(option);
    });
    
    // Set current filter values
    statusFilter.value = filterState.status;
    projectFilter.value = filterState.project;
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const projectFilter = document.getElementById('projectFilter').value;
    
    filterState.status = statusFilter;
    filterState.project = projectFilter;
    
    renderTaskList();
}

function clearFilters() {
    filterState.status = 'all';
    filterState.project = 'all';
    
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('projectFilter').value = 'all';
    
    renderTaskList();
}

function getFilteredTasks() {
    return tasks.filter(task => {
        const statusMatch = filterState.status === 'all' || task.status === filterState.status;
        const projectMatch = filterState.project === 'all' || task.project === filterState.project;
        return statusMatch && projectMatch;
    });
}

function smartSort(tasksToSort) {
    if (!smartSortEnabled) return tasksToSort;
    
    return tasksToSort.sort((a, b) => {
        // Priority order: in-progress > paused > not-started > completed > cancelled
        const statusPriority = {
            'in-progress': 5,
            'paused': 4,
            'not-started': 3,
            'completed': 2,
            'cancelled': 1
        };
        
        const statusDiff = statusPriority[b.status] - statusPriority[a.status];
        if (statusDiff !== 0) return statusDiff;
        
        // Within same status, sort by last updated (most recent first)
        return new Date(b.lastUpdated) - new Date(a.lastUpdated);
    });
}