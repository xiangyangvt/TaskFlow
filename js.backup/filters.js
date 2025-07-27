// Filter and sorting functionality
function setupFilters() {
    // Get all status checkboxes
    const statusCheckboxes = [
        document.getElementById('filter-not-started'),
        document.getElementById('filter-in-progress'),
        document.getElementById('filter-paused'),
        document.getElementById('filter-completed')
    ];
    
    // Setup project filters
    const projectFiltersContainer = document.getElementById('project-filters');
    if (projectFiltersContainer) {
        // Clear existing project filters
        projectFiltersContainer.innerHTML = '';
        
        // Get unique projects
        const projects = [...new Set(tasks.map(task => task.project).filter(p => p))];
        
        // Create checkboxes for each project
        projects.forEach(project => {
            const filterOption = document.createElement('div');
            filterOption.className = 'filter-option';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `filter-${project}`;
            checkbox.value = project;
            checkbox.checked = true;
            
            const label = document.createElement('label');
            label.setAttribute('for', `filter-${project}`);
            label.textContent = project;
            
            filterOption.appendChild(checkbox);
            filterOption.appendChild(label);
            projectFiltersContainer.appendChild(filterOption);
        });
    }
}

function applyFilters() {
    // Get selected statuses
    const selectedStatuses = [];
    const statusCheckboxes = [
        document.getElementById('filter-not-started'),
        document.getElementById('filter-in-progress'),
        document.getElementById('filter-paused'),
        document.getElementById('filter-completed')
    ];
    
    statusCheckboxes.forEach(checkbox => {
        if (checkbox && checkbox.checked) {
            selectedStatuses.push(checkbox.value);
        }
    });
    
    // Get selected projects
    const selectedProjects = [];
    const projectCheckboxes = document.querySelectorAll('#project-filters input[type="checkbox"]:checked');
    projectCheckboxes.forEach(checkbox => {
        selectedProjects.push(checkbox.value);
    });
    
    // Update filter state
    filterState.statuses = selectedStatuses;
    filterState.projects = selectedProjects;
    
    renderTaskList();
    
    // Hide filter menu
    const filterContent = document.getElementById('filter-content');
    if (filterContent) {
        filterContent.style.display = 'none';
    }
}

function clearFilters() {
    // Check all status checkboxes
    const statusCheckboxes = [
        document.getElementById('filter-not-started'),
        document.getElementById('filter-in-progress'),
        document.getElementById('filter-paused'),
        document.getElementById('filter-completed')
    ];
    
    statusCheckboxes.forEach(checkbox => {
        if (checkbox) checkbox.checked = true;
    });
    
    // Check all project checkboxes
    const projectCheckboxes = document.querySelectorAll('#project-filters input[type="checkbox"]');
    projectCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
    });
    
    // Reset filter state
    filterState.statuses = ['not-started', 'in-progress', 'paused', 'completed'];
    filterState.projects = [];
    
    renderTaskList();
}

function getFilteredTasks() {
    return tasks.filter(task => {
        // Check status filter
        const statusMatch = !filterState.statuses || filterState.statuses.length === 0 || filterState.statuses.includes(task.status);
        
        // Check project filter
        const projectMatch = !filterState.projects || filterState.projects.length === 0 || 
                           (task.project && filterState.projects.includes(task.project)) ||
                           (!task.project && filterState.projects.includes('No Project'));
        
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