document.addEventListener('DOMContentLoaded', function() {
    // Tabs
    document.querySelectorAll('.retro-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.retro-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const content = document.getElementById(tab.dataset.tab + '-content');
            if(content) content.classList.add('active');
        });
    });
    // Activa la primera pestaña por defecto
    const firstTab = document.querySelector('.retro-tab');
    if (firstTab) firstTab.click();

    // Pomodoro listeners
    document.getElementById('pomodoro-start').onclick = startPomodoro;
    document.getElementById('pomodoro-pause').onclick = pausePomodoro;
    document.getElementById('pomodoro-reset').onclick = resetPomodoro;
    document.getElementById('pomodoro-work').onchange = function() {
        if(!isBreak) {
            pomodoroTime = parseInt(this.value)*60;
            updatePomodoroDisplay();
        }
    };
    document.getElementById('pomodoro-break').onchange = function() {
        if(isBreak) {
            pomodoroTime = parseInt(this.value)*60;
            updatePomodoroDisplay();
        }
    };

    // Otras inicializaciones
    resetPomodoro();
    renderNotes();
    renderTasksList();
    renderCalendar();
    updateStats();
    updateClock();
});

// ========== TEMA CLARO/OSCURO ==========
const themeBtn = document.getElementById('theme-toggle');
themeBtn.onclick = function() {
  document.body.classList.toggle('light');
  localStorage.setItem('retro-theme', document.body.classList.contains('light') ? 'light' : 'dark');
};
if (localStorage.getItem('retro-theme') === 'light') {
  document.body.classList.add('light');
} else {
  document.body.classList.remove('light');
}

// ========== NOTIFICACIONES RETRO ==========
function showNotification(msg) {
  const notif = document.getElementById('notification');
  notif.textContent = msg;
  notif.style.display = 'block';
  notif.classList.remove('fadeout');
  // Sonido retro opcional
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 880;
    o.connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 120);
  } catch {}
  setTimeout(() => {
    notif.classList.add('fadeout');
    setTimeout(() => notif.style.display = 'none', 400);
  }, 1800);
}

// ========== CALENDARIO ==========
const calendarEl = document.getElementById('calendar');
const calendarMonthEl = document.getElementById('calendar-month');
const calendarTasksEl = document.getElementById('calendar-tasks');
let calendarDate = new Date();

function getMonthName(month, year) {
  return `${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][month]} ${year}`;
}
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getPriorityColor(priority) {
  if(priority === 'alta') return 'var(--retro-danger,#ff6b6b)';
  if(priority === 'media') return 'var(--retro-warning,#ffe66d)';
  return 'var(--retro-secondary,#4ecdc4)';
}
function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  calendarMonthEl.textContent = getMonthName(month, year);

  // Weekdays
  let html = '';
  ['D','L','M','M','J','V','S'].forEach(wd => {
    html += `<div class="calendar-weekday">${wd}</div>`;
  });

  // Days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const tasks = JSON.parse(localStorage.getItem('retro-tasks')||'[]');
  for(let i=0; i<firstDay; i++) html += `<div></div>`;
  for(let d=1; d<=daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayTasks = tasks.filter(t => t.date === dateStr);
    let hasTask = dayTasks.length > 0;
    let priorityClass = '';
    if(hasTask) {
      // Si hay varias tareas, muestra el color de la prioridad más alta
      if(dayTasks.some(t=>t.priority==='alta')) priorityClass = ' task-dot-alta';
      else if(dayTasks.some(t=>t.priority==='media')) priorityClass = ' task-dot-media';
      else priorityClass = ' task-dot-baja';
    }
    html += `<div class="calendar-day${dateStr===getTodayStr()?' today':''}${hasTask?' has-task':''}" data-date="${dateStr}">
      ${d}${hasTask?`<span class="task-dot${priorityClass}"></span>`:''}
    </div>`;
  }
  calendarEl.innerHTML = html;

  // Día seleccionado
  document.querySelectorAll('.calendar-day').forEach(dayEl => {
    dayEl.onclick = () => {
      document.querySelectorAll('.calendar-day').forEach(e=>e.classList.remove('selected'));
      dayEl.classList.add('selected');
      showTasksForDate(dayEl.dataset.date);
    };
  });
}
document.getElementById('prev-month').onclick = () => {
  calendarDate.setMonth(calendarDate.getMonth()-1);
  renderCalendar();
  calendarTasksEl.innerHTML = '';
};
document.getElementById('next-month').onclick = () => {
  calendarDate.setMonth(calendarDate.getMonth()+1);
  renderCalendar();
  calendarTasksEl.innerHTML = '';
};
renderCalendar();

// ========== TAREAS ==========
function renderTasksList(filterDate=null) {
  const tasks = JSON.parse(localStorage.getItem('retro-tasks')||'[]');
  const list = document.getElementById('tasks-list');
  let filtered = filterDate ? tasks.filter(t=>t.date===filterDate) : tasks;
  if(filtered.length===0) {
    list.innerHTML = '<div style="opacity:.7;font-size:.95em;">No hay tareas.</div>';
    return;
  }
  list.innerHTML = filtered.map((t,i)=>`
    <div class="retro-task${t.completed?' completed':''}">
      <input type="checkbox" ${t.completed?'checked':''} data-index="${i}" class="task-check">
      <span class="task-title" contenteditable="true" data-index="${i}">${t.title}</span>
      <span class="task-date">${t.date}</span>
      <span class="task-priority ${t.priority}">${t.priority}</span>
      <span class="task-actions">
        <button class="edit-task" data-index="${i}"><i class="fas fa-edit"></i></button>
        <button class="delete-task" data-index="${i}"><i class="fas fa-trash"></i></button>
      </span>
    </div>
  `).join('');
}
function showTasksForDate(date) {
  const tasks = JSON.parse(localStorage.getItem('retro-tasks')||'[]').filter(t=>t.date===date);
  if(tasks.length===0) {
    calendarTasksEl.innerHTML = `<div style="opacity:.7;">No hay tareas para este día.</div>`;
    return;
  }
  calendarTasksEl.innerHTML = tasks.map(t=>`
    <div class="retro-task${t.completed?' completed':''}">
      <span class="task-title">${t.title}</span>
      <span class="task-priority ${t.priority}">${t.priority}</span>
    </div>
  `).join('');
}
document.getElementById('task-form').onsubmit = function(e) {
  e.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const date = document.getElementById('task-date').value;
  const priority = document.getElementById('task-priority').value;
  if(!title || !date) return;
  const tasks = JSON.parse(localStorage.getItem('retro-tasks')||'[]');
  tasks.push({title, date, priority, completed:false});
  localStorage.setItem('retro-tasks', JSON.stringify(tasks));
  renderTasksList();
  renderCalendar();
  showNotification('Tarea agregada');
  this.reset();
};
document.getElementById('tasks-list').onclick = function(e) {
  // Eliminar tarea
  if(e.target.classList.contains('delete-task') || e.target.closest('.delete-task')) {
    const idx = e.target.dataset.index || e.target.closest('.delete-task').dataset.index;
    let tasks = JSON.parse(localStorage.getItem('retro-tasks')||'[]');
    tasks.splice(idx,1);
    localStorage.setItem('retro-tasks', JSON.stringify(tasks));
    renderTasksList();
    renderCalendar();
    showNotification('Tarea eliminada');
  }
  // Completar tarea
  if(e.target.classList.contains('task-check')) {
    let tasks = JSON.parse(localStorage.getItem('retro-tasks')||'[]');
    tasks[e.target.dataset.index].completed = e.target.checked;
    localStorage.setItem('retro-tasks', JSON.stringify(tasks));
    renderTasksList();
    renderCalendar();
    showNotification(e.target.checked ? '¡Tarea completada!' : 'Tarea marcada como pendiente');
  }
  // Editar tarea
  if(e.target.classList.contains('edit-task') || e.target.closest('.edit-task')) {
    const idx = e.target.dataset.index || e.target.closest('.edit-task').dataset.index;
    let tasks = JSON.parse(localStorage.getItem('retro-tasks')||'[]');
    const newTitle = prompt('Editar tarea:', tasks[idx].title);
    if(newTitle !== null && newTitle.trim() !== '') {
      tasks[idx].title = newTitle.trim();
      localStorage.setItem('retro-tasks', JSON.stringify(tasks));
      renderTasksList();
      renderCalendar();
      showNotification('Tarea editada');
    }
  }
};
// Edición rápida con contenteditable
document.getElementById('tasks-list').addEventListener('blur', function(e){
  if(e.target.classList.contains('task-title')) {
    const idx = e.target.dataset.index;
    let tasks = JSON.parse(localStorage.getItem('retro-tasks')||'[]');
    tasks[idx].title = e.target.textContent.trim();
    localStorage.setItem('retro-tasks', JSON.stringify(tasks));
    renderTasksList();
    renderCalendar();
    showNotification('Tarea editada');
  }
}, true);
renderTasksList();

// ========== NOTAS ==========
function renderNotes() {
  const notes = JSON.parse(localStorage.getItem('retro-notes')||'[]');
  const list = document.getElementById('notes-list');
  if(notes.length===0) {
    list.innerHTML = '<div style="opacity:.7;">No hay notas.</div>';
    return;
  }
  list.innerHTML = notes.map((n,i)=>`
  <div class="note" data-color="${n.color || 'yellow'}">
    <div class="note-title" contenteditable="true" data-index="${i}">${n.title}</div>
    <div class="note-content" contenteditable="true" data-index="${i}">${n.content}</div>
    <div class="note-actions">
      <button class="delete-note" data-index="${i}"><i class="fas fa-trash"></i></button>
    </div>
  </div>
`).join('');

}
document.getElementById('note-form').onsubmit = function(e) {
  e.preventDefault();
  const title = document.getElementById('note-title').value.trim();
const content = document.getElementById('note-content').value.trim();
const color = document.getElementById('note-color').value;

  if(!title || !content) return;
  const notes = JSON.parse(localStorage.getItem('retro-notes')||'[]');
 notes.push({title, content, color});

  localStorage.setItem('retro-notes', JSON.stringify(notes));
  renderNotes();
  showNotification('Nota agregada');
  this.reset();
};
document.getElementById('notes-list').onclick = function(e) {
  if(e.target.classList.contains('delete-note') || e.target.closest('.delete-note')) {
    const idx = e.target.dataset.index || e.target.closest('.delete-note').dataset.index;
    let notes = JSON.parse(localStorage.getItem('retro-notes')||'[]');
    notes.splice(idx,1);
    localStorage.setItem('retro-notes', JSON.stringify(notes));
    renderNotes();
    showNotification('Nota eliminada');
  }
};
// Edición rápida de notas
document.getElementById('notes-list').addEventListener('blur', function(e){
  let notes = JSON.parse(localStorage.getItem('retro-notes')||'[]');
  if(e.target.classList.contains('note-title')) {
    const idx = e.target.dataset.index;
    notes[idx].title = e.target.textContent.trim();
    localStorage.setItem('retro-notes', JSON.stringify(notes));
    renderNotes();
    showNotification('Nota editada');
  }
  if(e.target.classList.contains('note-content')) {
    const idx = e.target.dataset.index;
    notes[idx].content = e.target.textContent.trim();
    localStorage.setItem('retro-notes', JSON.stringify(notes));
    renderNotes();
    showNotification('Nota editada');
  }
}, true);
renderNotes();

// ========== POMODORO ==========
let pomodoroTimer = null, pomodoroTime = 25*60, isBreak = false, pomodoroTotal = pomodoroTime;

// ========== ESTILO DOT DE PRIORIDAD EN CALENDARIO ==========
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fadeout { to { opacity: 0; } }
`;
document.head.appendChild(style);
function updateClock() {
    const clock = document.getElementById('digital-clock');
    setInterval(() => {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString('es-AR');
    }, 1000);
}
document.getElementById('fullscreen-btn').onclick = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
};
document.getElementById('today-btn').onclick = () => {
    calendarDate = new Date();
    renderCalendar();
};
function updateStats() {
    const tasks = JSON.parse(localStorage.getItem('retro-tasks') || '[]');
    const completed = tasks.filter(t => t.completed).length;
    document.getElementById('tasks-completed').textContent = completed;
    document.getElementById('tasks-total').textContent = tasks.length;
    document.getElementById('total-completed').textContent = completed;

    // Pomodoro
    const sessions = parseInt(localStorage.getItem('pomodoro-sessions') || '0');
    const minutes = sessions * parseInt(document.getElementById('pomodoro-work').value || 25);
    document.getElementById('focus-time').textContent = `${Math.floor(minutes / 60)}h`;
    document.getElementById('sessions-today').textContent = sessions;

    // Score estimado
    const score = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
    document.getElementById('productivity-score').textContent = `${score}%`;
}
function initTabs() {
    document.querySelectorAll('.retro-tab').forEach(tab => {
        tab.onclick = function() {
            document.querySelectorAll('.retro-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.retro-tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).style.display = 'block';
        };
    });
    // Optionally activate the first tab by default
    const firstTab = document.querySelector('.retro-tab');
    if (firstTab) firstTab.click();
}
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    // ...tus otras inicializaciones...
    loadSavedData();
});
// Llama a initTabs cuando cargue el DOM
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    // ...tus otras inicializaciones...
    initCalendar();
    initNotes();
    initPomodoro();
    initTasks();
    initUIEffects();
    loadSavedData();
});

function loadSavedData() {
    updateStats();
    updateClock();
    initTabs();
}
function loadSavedData() {
    updateStats();
    updateClock();
}
    const yes = document.getElementById('confirm-yes');
    const no = document.getElementById('confirm-no');

    const clean = () => {
        modal.style.display = 'none';
        yes.onclick = null;
        no.onclick = null;
    };

    yes.onclick = () => { clean(); if (onConfirm) onConfirm(); };
// Llama a initTabs cuando cargue el DOM
// ========== POMODORO DISPLAY ==========
// Only one implementation of updatePomodoroDisplay should exist
function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroTime / 60);
    const seconds = pomodoroTime % 60;
    document.getElementById('pomodoro-timer').textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Optional: update circular progress if exists
    const circle = document.getElementById('pomodoro-circle');
    if (circle) {
        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (pomodoroTime / pomodoroTotal) * circumference;
        circle.style.strokeDasharray = `${circumference}`;
        circle.style.strokeDashoffset = `${offset}`;
    }
}
function startPomodoro() {
    if (pomodoroTimer) return;
    if (!pomodoroTime || isNaN(pomodoroTime)) {
        resetPomodoro();
    }
    pomodoroTotal = pomodoroTime;
    updatePomodoroDisplay(); // <-- Asegura que el display esté correcto al iniciar
    pomodoroTimer = setInterval(() => {
        if (pomodoroTime > 0) {
            pomodoroTime--;
            updatePomodoroDisplay();
        } else {
            clearInterval(pomodoroTimer);
            pomodoroTimer = null;
            isBreak = !isBreak;

            const newTime = isBreak
                ? parseInt(document.getElementById('pomodoro-break').value)*60
                : parseInt(document.getElementById('pomodoro-work').value)*60;
            pomodoroTime = newTime;
            pomodoroTotal = newTime;

            if (!isBreak) {
                let sessions = parseInt(localStorage.getItem('pomodoro-sessions') || '0') + 1;
                localStorage.setItem('pomodoro-sessions', sessions);
            }

            updateStats();
            updatePomodoroDisplay();
            showNotification(isBreak ? '¡Descanso!' : '¡A trabajar!');
        }
    }, 1000);
}
function pausePomodoro() {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
}
function resetPomodoro() {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
    isBreak = false;
    pomodoroTime = parseInt(document.getElementById('pomodoro-work').value) * 60;
    pomodoroTotal = pomodoroTime;
    updatePomodoroDisplay();
}