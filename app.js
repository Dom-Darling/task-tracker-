const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const error = document.querySelector('#error');
const emptyMessage = document.querySelector('#empty-message');
const status = document.querySelector('#status');

const storageWarning = document.querySelector('#storage-warning');

// State is the data our application currently remembers.
const tasks = loadTasks();

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

// Watch for tasks entering the screen, then animate each row once.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (!reducedMotion.matches && entry.target.animate) {
          entry.target.animate(
            [
              { opacity: 0, transform: 'translateY(18px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 500, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
          );
        }
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0.1 })
  : null;

// Stop any active effects if the motion preference changes.
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    document.getAnimations().forEach((animation) => animation.cancel());
  }
});
function updateTaskCount() {
  const completedCount = tasks.filter(task => task.completed).length;
  const activeCount = tasks.length - completedCount;

  status.textContent = `${activeCount} active · ${completedCount} completed`;
}
// Rebuild the visible list from the current data.
function renderTasks() {
  revealObserver?.disconnect();
  list.replaceChildren();

  for (const task of tasks) {
  const item = document.createElement('li');
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  const text = document.createElement('span');

  checkbox.type = 'checkbox';
  checkbox.checked = task.completed === true;
  text.textContent = task.title;
  text.style.textDecoration = task.completed ? 'line-through' : 'none';

  checkbox.addEventListener('change', () => {
    task.completed = checkbox.checked;
    text.style.textDecoration = task.completed ? 'line-through' : 'none';

    localStorage.setItem('myflexxzone-tasks', JSON.stringify(tasks));
  });

  label.append(checkbox, text);
  const deleteButton = document.createElement('button');
deleteButton.type = 'button';
deleteButton.textContent = 'Delete';
deleteButton.setAttribute('aria-label', `Delete ${task.title}`);

deleteButton.addEventListener('click', () => {
  const index = tasks.indexOf(task);
  tasks.splice(index, 1);

  localStorage.setItem('myflexxzone-tasks', JSON.stringify(tasks));
  renderTasks();
});

item.append(label, deleteButton);
list.append(item);
  revealObserver?.observe(item);
}
  emptyMessage.hidden = tasks.length > 0;
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
