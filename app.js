const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const error = document.querySelector('#error');
const emptyMessage = document.querySelector('#empty-message');
const status = document.querySelector('#status');

const storageWarning = document.querySelector('#storage-warning');

// State is the data our application currently remembers.
const tasks = loadTasks();
let currentFilter = 'all';

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
  text.textContent = task.title;
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
  const deleteButton = document.createElement('button');
deleteButton.type = 'button';
deleteButton.textContent = 'Delete';
deleteButton.setAttribute('aria-label', `Delete ${task.title}`);

deleteButton.addEventListener('click', () => {
  const index = tasks.indexOf(task);
  tasks.splice(index, 1);

  saveTasks();
  renderTasks();
});

item.append(label, deleteButton);
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
  tasks.push({ title, completed: false });
  saveTasks();
  renderTasks();
  form.reset();
  input.focus();
});

// Show saved tasks when the page first opens.
renderTasks();
