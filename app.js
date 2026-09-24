const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const dueDateInput = document.querySelector('#task-due-date');
const list = document.querySelector('#task-list');
const error = document.querySelector('#error');
const emptyMessage = document.querySelector('#empty-message');
const status = document.querySelector('#status');

const storageWarning = document.querySelector('#storage-warning');
const undoArea = document.querySelector('#undo-area');
const undoMessage = document.querySelector('#undo-message');
const undoButton = document.querySelector('#undo-button');
const exportButton = document.querySelector('#export-button');
const backupStatus = document.querySelector('#backup-status');
const restoreFile = document.querySelector('#restore-file');
let lastDeletedTask = null;

// State is the data our application currently remembers.
const tasks = loadTasks();
let currentFilter = 'all';
exportButton.addEventListener('click', () => {
  const backup = {
    version: 1,
    tasks: tasks
  };

  const backupText = JSON.stringify(backup, null, 2);
  const file = new Blob([backupText], {
    type: 'application/json'
  });

  const fileUrl = URL.createObjectURL(file);
  const link = document.createElement('a');

  link.href = fileUrl;
  link.download = 'myflexxzone-backup.json';
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);

  backupStatus.textContent =
    'Backup download requested. Check your browser’s downloads.';
});
restoreFile.addEventListener('change', async () => {
  const file = restoreFile.files[0];
  if (!file) return;
  restoreFile.disabled = true;

  try {
    const fileText = await file.text();
    const backup = JSON.parse(fileText);

    if (
      backup === null ||
      typeof backup !== 'object' ||
      backup.version !== 1 ||
      !Array.isArray(backup.tasks)
    ) {
      throw new Error('Unrecognized backup format');
    }

    const tasksAreValid = backup.tasks.every(task => {
      if (
        task === null ||
        typeof task !== 'object' ||
        typeof task.title !== 'string' ||
        task.title.trim() === '' ||
        task.title.length > 200 ||
        typeof task.completed !== 'boolean'
      ) {
        return false;
      }

      if (task.dueDate === undefined || task.dueDate === '') {
        return true;
      }

      if (
        typeof task.dueDate !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
      ) {
        return false;
      }

      const date = new Date(`${task.dueDate}T00:00:00Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === task.dueDate
      );
    });

    if (!tasksAreValid) {
      throw new Error('Backup contains invalid task data');
    }
    // Copy only the fields this application understands.
    const restoredTasks = backup.tasks.map(task => ({
      title: task.title.trim(),
      completed: task.completed,
      dueDate: task.dueDate || ''
    }));

    const confirmed = window.confirm(
      `Replace your current ${tasks.length} tasks with ${restoredTasks.length} tasks from this backup? ` +
      'This replaces the entire list, including tasks hidden by filters. ' +
      'Download a backup of your current list first if you want to keep it.'
    );

    if (!confirmed) {
      backupStatus.textContent = 'Restore cancelled. Your tasks are unchanged.';
      return;
    }

    // Save successfully before changing the list held in memory.
    try {
      localStorage.setItem('myflexxzone-tasks', JSON.stringify(restoredTasks));
    } catch (error) {
      backupStatus.textContent =
        'Could not save the restored tasks. Your current list is unchanged.';
      return;
    }

    tasks.length = 0;
    for (const task of restoredTasks) tasks.push(task);
    lastDeletedTask = null;
    undoArea.hidden = true;
    undoMessage.textContent = '';
    storageWarning.textContent = '';
    clearTimeout(celebrationTimer);
    main.classList.remove('is-celebrating');
    celebration.textContent = '';
    currentFilter = 'all';
    filterButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === 'all'));
    });
    renderTasks();
    backupStatus.textContent = `Restored ${tasks.length} tasks from backup.`;
    input.focus();
  } catch (error) {
    backupStatus.textContent =
      'Could not read this backup. Choose a MyFlexXZone JSON backup.';
  } finally {
    restoreFile.value = '';
    restoreFile.disabled = false;
  }
});

undoButton.addEventListener('click', () => {
  if (lastDeletedTask === null) return;

  tasks.splice(lastDeletedTask.index, 0, lastDeletedTask.task);
  lastDeletedTask = null;

  saveTasks();
  renderTasks();

  undoArea.hidden = true;
  undoMessage.textContent = '';
  input.focus();
});

const filterButtons = document.querySelectorAll('#task-filters button');

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach(filterButton => {
      filterButton.setAttribute(
        'aria-pressed',
        String(filterButton.dataset.filter === currentFilter)
      );
    });

    renderTasks();
  });
});

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem('myflexxzone-tasks');

    if (savedTasks === null) {
      return [];
    }

    const parsedTasks = JSON.parse(savedTasks);

    // Check that the saved data contains valid tasks.
    if (
      !Array.isArray(parsedTasks) ||
      !parsedTasks.every(task =>
        task !== null &&
        typeof task === 'object' &&
        typeof task.title === 'string' &&
        typeof task.completed === 'boolean'
      )
    ) {
      throw new Error('Invalid saved tasks');
    }

    return parsedTasks;
  } catch (error) {
    storageWarning.textContent =
      'Saved tasks could not be loaded. Showing an empty list. New changes may replace the previous saved list.';
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem('myflexxzone-tasks', JSON.stringify(tasks));
    storageWarning.textContent = '';
  } catch (error) {
    storageWarning.textContent =
      'Changes could not be saved. They may be lost when you refresh or close this page.';
  }
}

// Completion briefly changes the theme; reduced-motion users get only text.
const main = document.querySelector('main');
const celebration = document.querySelector('#celebration');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let celebrationTimer;

function celebrateCompletion() {
  clearTimeout(celebrationTimer);
  main.classList.remove('is-celebrating');
  celebration.textContent = '✦ Task complete ✦';

  if (!reducedMotion.matches) {
    // Restart the short animation when another task is completed quickly.
    void main.offsetWidth;
    main.classList.add('is-celebrating');
  }

  celebrationTimer = setTimeout(() => {
    main.classList.remove('is-celebrating');
    celebration.textContent = '';
  }, 1800);
}

reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) main.classList.remove('is-celebrating');
});

function updateTaskCount() {
  const completedCount = tasks.filter(task => task.completed).length;
  const activeCount = tasks.length - completedCount;

  status.textContent = `${activeCount} active · ${completedCount} completed`;
}
// Rebuild the visible list from the current data.
function renderTasks() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  list.replaceChildren();

const visibleTasks = tasks.filter(task => {
  if (currentFilter === 'active') {
    return !task.completed;
  }

  if (currentFilter === 'completed') {
    return task.completed;
  }

  return true;
});

for (const task of visibleTasks) {
  const item = document.createElement('li');
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  const text = document.createElement('span');

  checkbox.type = 'checkbox';
  checkbox.checked = task.completed === true;
    const isOverdue =
    Boolean(task.dueDate) &&
    task.dueDate < today &&
    !task.completed;

  text.textContent = task.dueDate
    ? `${task.title} — Due: ${task.dueDate}${isOverdue ? ' — Overdue' : ''}`
    : task.title;
  text.style.textDecoration = task.completed ? 'line-through' : 'none';

  checkbox.addEventListener('change', () => {
    const hadFocus = document.activeElement === checkbox;
    const rowIndex = visibleTasks.indexOf(task);
    task.completed = checkbox.checked;
    saveTasks();
    renderTasks();

    // Keep keyboard focus usable even when filtering removes this row.
    if (hadFocus) {
      const checkboxes = list.querySelectorAll('input[type="checkbox"]');
      const nextCheckbox = checkboxes[Math.min(rowIndex, checkboxes.length - 1)];
      (nextCheckbox || document.querySelector('#task-filters [aria-pressed="true"]')).focus();
    }
    if (task.completed) celebrateCompletion();
  });

  label.append(checkbox, text);
const editButton = document.createElement('button');
editButton.type = 'button';
editButton.textContent = 'Edit';
editButton.setAttribute('aria-label', `Edit ${task.title}`);

editButton.addEventListener('click', () => {
  const newTitle = window.prompt('Edit your task:', task.title);
  if (newTitle === null) return;

  const trimmedTitle = newTitle.trim();
  if (trimmedTitle === '' || trimmedTitle.length > 200) {
    window.alert('Enter a task between 1 and 200 characters.');
    return;
  }

  task.title = trimmedTitle;
  saveTasks();
  renderTasks();

  // Restore keyboard focus after rebuilding the task rows.
  const rowIndex = visibleTasks.indexOf(task);
  list.children[rowIndex]?.querySelector('button')?.focus();
});

const deleteButton = document.createElement('button');
deleteButton.type = 'button';
deleteButton.textContent = 'Delete';
deleteButton.setAttribute('aria-label', `Delete ${task.title}`);

deleteButton.addEventListener('click', () => {
  const index = tasks.indexOf(task);

  lastDeletedTask = {
    task: task,
    index: index
  };

  tasks.splice(index, 1);

  saveTasks();
  renderTasks();

  undoMessage.textContent = `Deleted: ${task.title}`;
  undoArea.hidden = false;
  undoButton.focus();
});

item.append(label, editButton, deleteButton);
list.append(item);
}
  emptyMessage.hidden = visibleTasks.length > 0;
  emptyMessage.textContent = tasks.length === 0
    ? 'Your list is empty. Add your first task above.'
    : currentFilter === 'active'
      ? 'No active tasks to show.'
      : 'No completed tasks to show.';
updateTaskCount();
}

// Submitting the form works with both the button and the Enter key.
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = input.value.trim();


  if (title === '') {
    error.textContent = 'Enter a task before adding it.';
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }

  error.textContent = '';
  input.removeAttribute('aria-invalid');
  tasks.push({
    title,
    completed: false,
    dueDate: dueDateInput.value
  });
  saveTasks();
  renderTasks();
  form.reset();
  input.focus();
});

// Show saved tasks when the page first opens.
renderTasks();
