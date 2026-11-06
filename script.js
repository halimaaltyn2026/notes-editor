
// Имя, под которым браузер хранит наши заметки
const KEY = 'notes-editor-notes';

// Находим на странице нужные элементы, чтобы потом с ними работать
const app = document.getElementById('app');          // весь редактор (две колонки или вкладки)
const listEl = document.getElementById('notes');     // список заметок
const textarea = document.getElementById('text');    // поле, где пишем текст
const delBtn = document.getElementById('del');       // кнопка «Удалить заметку»

// notes — массив всех заметок, currentId — какая заметка сейчас открыта
let notes = load();
let currentId = null;
let previewTimer;

// Достаём заметки из браузера. Если там пусто или ошибка — начинаем с пустого списка
function load() {
  try { 
    return JSON.parse(localStorage.getItem(KEY)) || []; 
  } catch (e) { 
    return []; 
  }
}

// Сохраняем все заметки в браузер
function save() {
  localStorage.setItem(KEY, JSON.stringify(notes));
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
  notes.forEach(note => {
    const li = document.createElement('li');
    li.textContent = titleOf(note);
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
  save();
  render();
  updatePreview();
});

// Запуск: рисуем список и открываем первую заметку, если она есть
render();
if (notes.length) openNote(notes[0].id);

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