const socket = io();
const codeArea = document.getElementById('code');
const inputBox = document.getElementById('input-box');
const outputDiv = document.getElementById('output');
const tabBar = document.getElementById('tab-bar');
const lineNumberDiv = document.getElementById('line-numbers');
let files = { 'Main.py': '' };
let activeFile = 'Main.py';
function switchTab(filename) {
    files[activeFile] = codeArea.value;
    activeFile = filename;
    codeArea.value = files[filename];
    updateLineNumbers();
    Array.from(tabBar.children).forEach(tab => tab.classList.remove('active'));
    document.getElementById(`tab-${filename}`).classList.add('active');
}
function addNewTab() {
    const name = prompt("Enter file name (e.g., File2.py):");
    if (!name || files[name]) return;
    files[name] = '';
    const newTab = document.createElement('div');
    newTab.className = 'tab';
    newTab.id = `tab-${name}`;
    newTab.onclick = () => switchTab(name);
    newTab.innerHTML = `<span>${name}</span><span class="close" onclick="closeTab(event, '${name}')">✖</span>`;
    tabBar.insertBefore(newTab, tabBar.lastElementChild);
    switchTab(name);
}
function closeTab(event, filename) {
    event.stopPropagation();
    if (filename === 'Main.py') return alert("Can't close Main.py");
    delete files[filename];
    document.getElementById(`tab-${filename}`).remove();
    if (activeFile === filename) switchTab(Object.keys(files)[0]);
}
function runCode() {
    const runBtn = document.querySelector("button[onclick='runCode()']");
    runBtn.textContent = "Running...";
    runBtn.disabled = true;

    outputDiv.innerHTML = '';
    files[activeFile] = codeArea.value;
    socket.emit('run_code', { code: files[activeFile] });

    setTimeout(() => {
        runBtn.textContent = "Run ▶";
        runBtn.disabled = false;
    }, 1500); // Adjust based on average run duration
}
socket.on('output', msg => {
    outputDiv.innerHTML += msg.replace(/\n/g, '<br>') + "<br>";
    document.getElementById("terminal").scrollTop = document.getElementById("terminal").scrollHeight;
});
inputBox.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const val = inputBox.value;
        socket.emit('user_input', val);
        inputBox.value = '';
    }
});
function clearTerminal() {
    outputDiv.innerHTML = '';
}
// Line number updater
function updateLineNumbers() {
    const lines = codeArea.value.split('\n').length;
    lineNumberDiv.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
}
    codeArea.addEventListener('input', updateLineNumbers);
    codeArea.addEventListener('scroll', () => {
        lineNumbers.scrollTop = codeArea.scrollTop;
    });
    codeArea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            setTimeout(updateLineNumbers, 0);  // Wait for new line to appear
        }
    });
    codeArea.addEventListener('paste', () => setTimeout(updateLineNumbers, 0));
// Auto-pairing logic
codeArea.addEventListener('keydown', function(e) {
    const pairs = {
        '"': '"',
        "'": "'",
        '(': ')',
        '[': ']',
        '{': '}'
    };
    if (pairs[e.key]) {
        e.preventDefault();
        const [start, end] = [codeArea.selectionStart, codeArea.selectionEnd];
        const open = e.key;
        const close = pairs[e.key];
        codeArea.value = codeArea.value.slice(0, start) + open + close + codeArea.value.slice(end);
        codeArea.selectionStart = codeArea.selectionEnd = start + 1;
        updateLineNumbers();
    }
    if (e.key === 'Backspace') {
        const [start, end] = [codeArea.selectionStart, codeArea.selectionEnd];
        const prev = codeArea.value[start - 1];
        const next = codeArea.value[start];
        const match = {
            '"': '"',
            "'": "'",
            '(': ')',
            '[': ']',
            '{': '}'
        };
        if (match[prev] && match[prev] === next) {
            e.preventDefault();
            codeArea.value = codeArea.value.slice(0, start - 1) + codeArea.value.slice(end + 1);
            codeArea.selectionStart = codeArea.selectionEnd = start - 1;
            updateLineNumbers();
        }
    }
});
window.onload = () => {
    codeArea.value = files['Main.py'];
    updateLineNumbers();
};
function saveFiles() {
    files[activeFile] = codeArea.value;
    localStorage.setItem('royal_editor_files', JSON.stringify(files));
    alert("Files saved!");
    }
function loadFiles() {
    const saved = localStorage.getItem('royal_editor_files');
    if (!saved) return alert("No saved files found!");
    files = JSON.parse(saved);
    // Clear all tabs except ➕ and Main.py
    Array.from(tabBar.children).forEach(tab => {
        const id = tab.id;
        if (id && id !== 'tab-Main.py' && id !== '') {
            tab.remove();
        }
    });
    // Rebuild tabs
    Object.keys(files).forEach(filename => {
        if (filename !== 'Main.py') {
            const newTab = document.createElement('div');
            newTab.className = 'tab';
            newTab.id = `tab-${filename}`;
            newTab.onclick = () => switchTab(filename);
            newTab.innerHTML = `<span>${filename}</span><span class="close" onclick="closeTab(event, '${filename}')">✖</span>`;
            tabBar.insertBefore(newTab, tabBar.lastElementChild);
        }
    });
    switchTab('Main.py');
    alert("Files loaded!");
}
function downloadCurrentFile() {
    const blob = new Blob([codeArea.value], { type: 'text/x-python' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = activeFile;
    a.click();
    }
function uploadPythonFile(event) {
    const file = event.target.files[0];
    if (!file || !file.name.endsWith('.py')) {
        alert('Please upload a .py file!');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const filename = file.name;
        if (files[filename]) {
            alert(`${filename} already exists. Please rename and try again.`);
            return;
        }
        files[filename] = content;
        const newTab = document.createElement('div');
        newTab.className = 'tab';
        newTab.id = `tab-${filename}`;
        newTab.onclick = () => switchTab(filename);
        newTab.innerHTML = `<span>${filename}</span><span class="close" onclick="closeTab(event, '${filename}')">✖</span>`;
        tabBar.insertBefore(newTab, tabBar.lastElementChild);
        switchTab(filename);
    };
    reader.readAsText(file);
}
function toggleSettingsMenu() {
    const menu = document.getElementById('settingsMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}
function openSettings() {
document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}
function changeFontSize(size) {
    document.getElementById('code').style.fontSize = size;
}
function changeFontFamily(font) {
    document.getElementById('code').style.fontFamily = font;
}
function changeTheme(theme) {
    const editor = document.querySelector('.editor');
    const terminal = document.querySelector('.terminal');
    const codeArea = document.getElementById('code');
    const lineNumbers = document.getElementById('line-numbers');
    const inputBox = document.getElementById('input-box');
    const output = document.getElementById('output');
    if (theme === 'light') {
        editor.style.background = '#80CBC4';
        codeArea.style.background = '#B4EBE6';
        codeArea.style.color = '#000000';
        lineNumbers.style.background = '#7886C7';
        lineNumbers.style.color = '#000000';
        terminal.style.background = '#ffffff';
        inputBox.style.background = '#D9DFC6';
        inputBox.style.color = '#000000';
        output.style.background = '#D9DFC6';
        output.style.color = '#000';
    } else {
        editor.style.background = '#1e1e1e';
        terminal.style.background = '#000000';
        codeArea.style.background = '#252526';
        codeArea.style.color = 'white';
        lineNumbers.style.background = '#2d2d2d';
        lineNumbers.style.color = '#888';
        inputBox.style.background = '#111';
        inputBox.style.color = 'lime';
        output.style.background = '#0c0c0c';
        output.style.color = 'lime';
    }
}
document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey && e.key === 'Enter') || (e.shiftKey && e.key === 'Enter')) {
        e.preventDefault();
        runCode();
    }
});
document.addEventListener('DOMContentLoaded', function () {
document.querySelectorAll('textarea').forEach(textarea => {
    textarea.addEventListener('keydown', function (e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const value = this.value;
        // TAB Key (add tab)
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            this.value = value.substring(0, start) + "\t" + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        }
        // Shift + TAB Key (remove tab)
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            // If the line starts with a tab character, remove it
            const lines = value.split('\n');
            const currentLine = lines[this.value.substring(0, start).split('\n').length - 1];
        // Check if the current line starts with a tab and remove it
        if (currentLine.startsWith("\t")) {
            lines[this.value.substring(0, start).split('\n').length - 1] = currentLine.substring(1);
            this.value = lines.join('\n');
            this.selectionStart = this.selectionEnd = start - 1;
        }}
        // ENTER Key with Auto-Indent
        if (e.key === 'Enter') {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const value = this.value;
            const lineStart = value.lastIndexOf("\n", start - 1) + 1;
            const currentLine = value.substring(lineStart, start);
            const indentMatch = currentLine.match(/^\s*/);
            let indent = indentMatch ? indentMatch[0] : "";
            if (currentLine.trim().endsWith(":")) {
                indent += "    ";
            }
            e.preventDefault();
            const newPos = start + 1 + indent.length;
            this.value = value.substring(0, start) + "\n" + indent + value.substring(end);
            this.selectionStart = this.selectionEnd = newPos;
        }
        // CTRL + BACKSPACE to remove only leading whitespace
        if (e.key === 'Backspace' && e.ctrlKey) {
            const start = this.selectionStart;
            const value = this.value;
            const lineStart = value.lastIndexOf("\n", start - 1) + 1;
            const currentLine = value.substring(lineStart, start);
            const leadingSpaces = currentLine.match(/^\s+/);
            if (leadingSpaces) {
                e.preventDefault();
                const spaceLength = leadingSpaces[0].length;
                this.value = value.substring(0, lineStart) +
                                value.substring(lineStart + spaceLength, value.length);
                this.selectionStart = this.selectionEnd = start - spaceLength;
            }
        }
    });
});
});
