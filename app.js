// Loader Handling
const loader = document.getElementById('loader');
window.addEventListener('load', () => {
  setTimeout(() => {
    loader.classList.add('hidden');
    if (localStorage.getItem('loggedInUser')) {
      showNotesSection();
    } else {
      document.getElementById('auth-section').classList.remove('hidden');
    }
  }, 800);
});

// Authentication
const signupBtn = document.getElementById('signup');
const loginBtn = document.getElementById('login');
const logoutBtn = document.getElementById('logout');
const authMessage = document.getElementById('auth-message');
const authSection = document.getElementById('auth-section');
const noteSection = document.getElementById('note-section');

signupBtn.onclick = signup;
loginBtn.onclick = login;
logoutBtn.onclick = () => {
  localStorage.removeItem('loggedInUser');
  location.reload();
};

function signup() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) {
    authMessage.textContent = "Username and password are required!";
    return;
  }
  localStorage.setItem(username, password);
  authMessage.textContent = "Signup successful! Please login.";
}

function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (localStorage.getItem(username) === password) {
    localStorage.setItem('loggedInUser', username);
    showNotesSection();
  } else {
    authMessage.textContent = "Wrong credentials.";
  }
}

function showNotesSection() {
  authSection.classList.add('hidden');
  noteSection.classList.remove('hidden');
  renderNotes();
}

// Notes System
const noteTitleInput = document.getElementById('note-title');
const noteInput = document.getElementById('note-input');
const saveNoteBtn = document.getElementById('save-note');
const notesList = document.getElementById('notes-list');
const emptyState = document.getElementById('empty-state');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const exportBtn = document.getElementById('export-notes');
const searchInput = document.getElementById('search-input');
const toastContainer = document.getElementById('toast-container');
const toggleThemeBtn = document.getElementById('toggle-theme');
const charCounter = document.getElementById('char-counter');

let notes = JSON.parse(localStorage.getItem('notes')) || [];
let undoStack = [];
let redoStack = [];

saveNoteBtn.onclick = addNote;
searchInput.addEventListener('input', (e) => renderNotes(e.target.value));
undoBtn.onclick = undo;
redoBtn.onclick = redo;
exportBtn.onclick = exportNotes;
toggleThemeBtn.onclick = toggleTheme;
noteInput.addEventListener('input', updateCharCounter);

// Autosave draft
noteTitleInput.value = localStorage.getItem('draftTitle') || '';
noteInput.value = localStorage.getItem('draftContent') || '';

noteTitleInput.addEventListener('input', saveDraft);
noteInput.addEventListener('input', saveDraft);

function saveDraft() {
  localStorage.setItem('draftTitle', noteTitleInput.value);
  localStorage.setItem('draftContent', noteInput.value);
}

// Character and Word Counter
function updateCharCounter() {
  const text = noteInput.value.trim();
  const charCount = text.length;
  const wordCount = text === '' ? 0 : text.split(/\s+/).length;
  charCounter.textContent = `${charCount} characters, ${wordCount} words`;
}

// Add Note
function addNote() {
  const title = noteTitleInput.value.trim();
  const content = noteInput.value.trim();
  const createdAt = new Date().toLocaleString();
  const finalTag = document.getElementById('custom-tag').value.trim();

  if (!content && !title) {
    alert('Please write something!');
    return;
  }

  undoStack.push([...notes]);
  notes.unshift({ title, content, tag: finalTag, createdAt, pinned: false });
  saveNotes();
  renderNotes();
  clearEditor();
  showToast('✅ Note saved!');
}

// Render Notes
function renderNotes(filter = '') {
  notesList.innerHTML = '';

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(filter.toLowerCase()) ||
    n.content.toLowerCase().includes(filter.toLowerCase()) ||
    (n.tag && n.tag.toLowerCase().includes(filter.toLowerCase()))
  );

  if (filteredNotes.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');

    const pinned = filteredNotes.filter(n => n.pinned);
    const unpinned = filteredNotes.filter(n => !n.pinned);
    const finalList = [...pinned, ...unpinned];

    finalList.forEach((note, index) => {
      const card = document.createElement('div');
      card.className = 'note-card pop-in';
      if (note.pinned) card.classList.add('pinned');

      const topRow = document.createElement('div');
      topRow.style.display = 'flex';
      topRow.style.justifyContent = 'space-between';
      topRow.style.alignItems = 'center';

      const title = document.createElement('h3');
      title.innerText = note.title || '(No Title)';
      title.style.flexGrow = '1';
      title.style.marginRight = '10px';
      topRow.appendChild(title);

      const buttonsDiv = document.createElement('div');
      buttonsDiv.style.display = 'flex';
      buttonsDiv.style.alignItems = 'center';

      const pinBtn = document.createElement('button');
      pinBtn.className = 'pin-btn';
      pinBtn.innerText = note.pinned ? '📌' : '📍';
      pinBtn.onclick = () => togglePin(index);
      buttonsDiv.appendChild(pinBtn);

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.innerText = '✏️';
      editBtn.onclick = () => editNote(index);
      buttonsDiv.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerText = '🗑️';
      deleteBtn.onclick = () => deleteNote(index);
      buttonsDiv.appendChild(deleteBtn);

      topRow.appendChild(buttonsDiv);
      card.appendChild(topRow);

      if (note.tag) {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.textContent = `#${note.tag}`;
        tag.style.cursor = 'pointer';
        tag.onclick = () => filterByTag(note.tag);
        card.appendChild(tag);
      }

      const content = document.createElement('p');
      content.innerText = note.content || '(No Content)';
      card.appendChild(content);

      const time = document.createElement('small');
      time.innerText = `Created: ${note.createdAt}`;
      card.appendChild(time);

      notesList.appendChild(card);
    });
  }
}

// Filter by Tag
function filterByTag(tagName) {
  searchInput.value = '';
  const filteredNotes = notes.filter(note => note.tag === tagName);
  renderFilteredNotes(filteredNotes);

  const showAllBtn = document.createElement('button');
  showAllBtn.textContent = 'Show All Notes';
  showAllBtn.className = 'show-all-btn';
  showAllBtn.onclick = () => {
    renderNotes();
    showAllBtn.remove();
  };
  notesList.prepend(showAllBtn);
}

function renderFilteredNotes(filteredNotes) {
  notesList.innerHTML = '';

  if (filteredNotes.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');

    filteredNotes.forEach((note, index) => {
      const card = document.createElement('div');
      card.className = 'note-card pop-in';
      if (note.pinned) card.classList.add('pinned');

      const title = document.createElement('h3');
      title.innerText = note.title || '(No Title)';
      card.appendChild(title);

      if (note.tag) {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.textContent = `#${note.tag}`;
        tag.style.cursor = 'pointer';
        tag.onclick = () => filterByTag(note.tag);
        card.appendChild(tag);
      }

      const content = document.createElement('p');
      content.innerText = note.content || '(No Content)';
      card.appendChild(content);

      const time = document.createElement('small');
      time.innerText = `Created: ${note.createdAt}`;
      card.appendChild(time);

      notesList.appendChild(card);
    });
  }
}

// Save
function saveNotes() {
  localStorage.setItem('notes', JSON.stringify(notes));
}

// Clear Editor
function clearEditor() {
  noteTitleInput.value = '';
  noteInput.value = '';
  document.getElementById('custom-tag').value = '';
  localStorage.removeItem('draftTitle');
  localStorage.removeItem('draftContent');
  updateCharCounter();
}

// Undo Redo
function undo() {
  if (undoStack.length) {
    redoStack.push([...notes]);
    notes = undoStack.pop();
    saveNotes();
    renderNotes();
    showToast('↩️ Undo successful!');
  }
}
function redo() {
  if (redoStack.length) {
    undoStack.push([...notes]);
    notes = redoStack.pop();
    saveNotes();
    renderNotes();
    showToast('🔁 Redo successful!');
  }
}

// Export
function exportNotes() {
  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notes_export.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Delete
function deleteNote(index) {
  undoStack.push([...notes]);
  notes.splice(index, 1);
  saveNotes();
  renderNotes();
  showToast('🗑️ Note deleted!');
}

// Edit
function editNote(index) {
  const note = notes[index];
  noteTitleInput.value = note.title;
  noteInput.value = note.content;
  document.getElementById('custom-tag').value = note.tag || '';

  undoStack.push([...notes]);
  notes.splice(index, 1);
  saveNotes();
  renderNotes();
  showToast('✏️ Editing note...');
}

// Toast
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2500);
}

// Theme Toggle
function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  toggleThemeBtn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
}

// Pin
function togglePin(index) {
  notes[index].pinned = !notes[index].pinned;
  saveNotes();
  renderNotes();
  setTimeout(() => {
    const cards = document.querySelectorAll('.note-card');
    if (cards[index]) {
      cards[index].classList.add('slide-animation');
    }
  }, 100);
}
