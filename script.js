
// Имя, под которым браузер хранит наши заметки
const KEY = 'notes-editor-notes';
const CURRENT_KEY = 'notes-editor-current';
const TIME_KEY = 'notes-editor-saved-at';

// Находим на странице нужные элементы, чтобы потом с ними работать
const app = document.getElementById('app');          // весь редактор (две колонки или вкладки)
const listEl = document.getElementById('notes');     // список заметок
const textarea = document.getElementById('text');    // поле, где пишем текст
const delBtn = document.getElementById('del');       // кнопка «Удалить заметку»

// Строка состояния под полем ввода
const statusEl = document.createElement('p');
statusEl.id = 'status';
textarea.insertAdjacentElement('afterend', statusEl);
// notes — массив всех заметок, currentId — какая заметка сейчас открыта
let notes = load();
let currentId = null;
let previewTimer;
let saveTimer;

// Достаём заметки из браузера. Если там пусто или ошибка — начинаем с пустого списка
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (!Array.isArray(data)) return [];
    return data.filter(n => n && typeof n.text === 'string' && n.id !== undefined);
  } catch (e) {
    return [];
  }
}

// Сохраняем все заметки в браузер
// Показываем время последнего сохранения
function showSavedTime(ts) {
  const time = new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  statusEl.textContent = 'Сохранено в ' + time;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(notes));
    const now = Date.now();
    localStorage.setItem(TIME_KEY, now);
    showSavedTime(now);
  } catch (e) {
    statusEl.textContent = e.name === 'QuotaExceededError'
      ? 'Не удалось сохранить: в браузере не хватает места. Скопируй текст и удали ненужные заметки.'
      : 'Не удалось сохранить заметку.';
  }
}

// Переключаем вкладку на узком экране: 'list' (заметки) или 'editor' (редактор)
function show(name) {
  app.className = `app show-${name}`;
}

// Название заметки для списка — это её первая строка
function titleOf(note) {
  const first = note.text.split('\n')[0].trim();
  return first || 'Без названия';
}

let query = '';

function normalize(s) {
  return s.trim().toLowerCase();
}

function matches(note, q) {
  if (!q) return true;
  return normalize(note.text).includes(q);
}

function highlight(el, text, q) {
  el.textContent = '';
  const lower = text.toLowerCase();
  let pos = 0;
  while (q) {
    const i = lower.indexOf(q, pos);
    if (i === -1) break;
    el.appendChild(document.createTextNode(text.slice(pos, i)));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(i, i + q.length);
    el.appendChild(mark);
    pos = i + q.length;
  }
  el.appendChild(document.createTextNode(text.slice(pos)));
}

// Рисуем список заметок заново
function render() {
  listEl.innerHTML = '';

  // Если заметок нет — показываем подсказку
  if (notes.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Заметок пока нет. Нажми «+ Новая заметка», чтобы начать.';
    listEl.appendChild(empty);
    return;
  }

  // Иначе добавляем в список каждую заметку
  const q = normalize(query);
const found = notes.filter(note => matches(note, q));
if (found.length === 0) {
  const empty = document.createElement('li');
  empty.className = 'empty';
  empty.textContent = 'Ничего не найдено. ';
  const btn = document.createElement('button');
  btn.textContent = 'Сбросить поиск';
  btn.onclick = () => {
    query = '';
    searchEl.value = '';
    render();
  };
  empty.appendChild(btn);
  listEl.appendChild(empty);
  return;
}
  
found.forEach(note => {
    const li = document.createElement('li');
    highlight(li, titleOf(note), q);
    if (note.id === currentId) li.className = 'active'; // выделяем открытую заметку
    
    li.onclick = () => { 
      openNote(note.id); 
      show('editor'); 
    }; // по клику открываем
    
    listEl.appendChild(li);
  });
}

// Открываем заметку: показываем её текст в поле и включаем поле и кнопку удаления
function openNote(id) {
  currentId = id;
  localStorage.setItem(CURRENT_KEY, id);
  const note = notes.find(n => n.id === id);
  textarea.disabled = false;
  delBtn.disabled = false;
  textarea.value = note ? note.text : '';
  render();
  updatePreview();
}

// Создаём новую пустую заметку и сразу открываем её
function createNote() {
  const note = { id: Date.now(), text: '' }; // id — это просто текущее время, оно всегда разное
  notes.unshift(note);                     // кладём заметку в начало списка
  save();
  openNote(note.id);
  show('editor');
  textarea.focus();                        // ставим курсор в поле
}

// Удаляем открытую заметку, но сначала спрашиваем подтверждение
function deleteNote() {
  if (currentId === null) return;
  if (!confirm('Удалить эту заметку? Это нельзя отменить.')) return; // «Отмена» — ничего не делаем
  
  notes = notes.filter(n => n.id !== currentId); // убираем заметку из списка
  save();
  currentId = null;
  localStorage.removeItem(CURRENT_KEY);
  textarea.value = '';
  textarea.disabled = true;                // поле и кнопка снова неактивны
  delBtn.disabled = true;
  render();
  show('list');
}

// Каждый раз, когда печатаем, обновляем текст заметки и сразу сохраняем
textarea.addEventListener('input', () => {
  const note = notes.find(n => n.id === currentId);
  if (!note) return;
  note.text = textarea.value;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 1000);
  render();
  updatePreview();
});

// Запуск: рисуем список и открываем первую заметку, если она есть
render();

const savedId = Number(localStorage.getItem(CURRENT_KEY));
const savedNote = notes.find(n => n.id === savedId);
if (savedNote) openNote(savedNote.id);
else if (notes.length) openNote(notes[0].id);
const savedAt = Number(localStorage.getItem(TIME_KEY));
if (savedAt) showSavedTime(savedAt);
function updatePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(function () {
    document.getElementById("preview").innerHTML =
      renderMarkdown(document.getElementById("text").value);
  }, 200);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return html.replace(/\n/g, "<br>");
}
const searchEl = document.getElementById('search');
searchEl.addEventListener('input', () => {
  query = searchEl.value;
  render();
});

// Экспорт: все заметки одним JSON-файлом
function exportNotes() {
  const data = {
    app: 'notes-editor',
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: notes
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notes-export.json';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('export-btn').addEventListener('click', exportNotes);

// Импорт: читаем выбранный файл, проверяем его и добавляем заметки
function importNotes(file) {
  // FileReader умеет читать файлы, которые выбрал человек
  const reader = new FileReader();

  // Эта функция сработает, когда файл полностью прочитан
  reader.onload = () => {
    let data;

    // Проверка 1: это вообще JSON?
    // JSON.parse падает с ошибкой, если внутри не JSON (например, картинка)
    try {
      data = JSON.parse(reader.result); // reader.result — текст файла
    } catch (e) {
      alert('Не удалось прочитать файл: это не JSON.');
      return; // выходим, ничего не меняя
    }

    // Проверка 2: это наш файл? Должна быть метка app: 'notes-editor'
    // и notes должен быть массивом. Так мы отличаем наш экспорт от чужого JSON
    if (!data || data.app !== 'notes-editor' || !Array.isArray(data.notes)) {
      alert('Это не файл экспорта notes-editor.');
      return;
    }

    // Проверка 3: у каждой заметки есть числовой id и текстовый text?
    // every — «все элементы массива подходят под условие»
    const valid = data.notes.every(
      n => n && typeof n.id === 'number' && typeof n.text === 'string'
    );
    if (!valid) {
      alert('Файл повреждён: у некоторых заметок неверная структура.');
      return;
    }

    // Правило для совпадающих заметок: если заметка с таким id уже есть,
    // оставляем текущую, а ту, что из файла, пропускаем.
    // Set — это список уникальных значений, в нём удобно искать id
    const ids = new Set(notes.map(n => n.id));

    const fresh = data.notes
      .filter(n => !ids.has(n.id))                 // оставляем только новые
      .map(n => ({ id: n.id, text: n.text }));     // берём только нужные поля, лишнее из файла не тащим

    notes = notes.concat(fresh); // добавляем новые заметки к существующим
    save();                      // сохраняем в браузер
    render();                    // перерисовываем список

    // Сообщаем человеку, что произошло
    alert(`Добавлено: ${fresh.length}, пропущено (уже есть): ${data.notes.length - fresh.length}`);
  };

  // Запускаем чтение файла как текста. Когда закончит, вызовется onload выше
  reader.readAsText(file);
}

// Находим кнопку и скрытое поле выбора файла
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

// Нажали «Импорт» → открываем окно выбора файла
importBtn.addEventListener('click', () => importFile.click());

// Файл выбран → отдаём его в importNotes
importFile.addEventListener('change', () => {
  const file = importFile.files[0]; // первый выбранный файл
  if (file) importNotes(file);
  importFile.value = ''; // сбрасываем выбор, чтобы можно было выбрать тот же файл ещё раз
});
