// Защита: заменяем опасные символы, чтобы браузер не принял текст за HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Превращаем текст заметки в HTML
function renderMarkdown(text) {
  // Сначала ВСЕГДА экранируем: после этого в тексте нет настоящих тегов
  let html = escapeHtml(text);

  // # Заголовок
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // **жирный**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // `код` в обратных кавычках
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // [текст](https://адрес): только http и https, без кавычек и пробелов в адресе
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)"']+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Список: подряд идущие строки, которые начинаются с "- "
  html = html.replace(/(?:^- .*(?:\n|$))+/gm, function (block) {
    const items = block
      .trim()
      .split("\n")
      .map(function (line) { return "<li>" + line.slice(2) + "</li>"; })
      .join("");
    return "<ul>" + items + "</ul>";
  });

  // Переносы строк
  return html.replace(/\n/g, "<br>");
}
