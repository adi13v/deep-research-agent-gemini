const API_BASE = '/api';

// ── DOM refs ───────────────────────────────────────────────────────────────
const queryEl = document.getElementById('query');
const sendBtn = document.getElementById('send-btn');
const statusBar = document.getElementById('status-bar');
const resultSec = document.getElementById('result-section');
const mdOutput = document.getElementById('markdown-output');
const srcSection = document.getElementById('sources-section');
const srcList = document.getElementById('sources-list');
const divider = document.getElementById('divider');

// ── Event listeners ───────────────────────────────────────────────────────
queryEl.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') doResearch();
});
sendBtn.addEventListener('click', doResearch);  

// ── Status helpers ────────────────────────────────────────────────────────
function setStatus(msg, state = '') {
    statusBar.className = state;
    statusBar.innerHTML = '';
    if (state === 'active') {
        statusBar.appendChild(document.createTextNode(msg + ' '));
        const cursor = document.createElement('span');
        cursor.className = 'blink';
        cursor.textContent = '█';
        statusBar.appendChild(cursor);
    } else {
        statusBar.textContent = msg;
    }
}

// ── Main research call ────────────────────────────────────────────────────
async function doResearch() {
    const query = queryEl.value.trim();
    if (!query) return;

    sendBtn.disabled = true;
    setStatus('RUNNING RESEARCH AGENT...', 'active');
    divider.style.display = 'none';
    resultSec.classList.remove('visible');
    srcSection.style.display = 'none';
    mdOutput.innerHTML = '';
    srcList.innerHTML = '';

    try {
        const resp = await fetch(`${API_BASE}/research`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                max_research_loops: 2,
                initial_search_query_count: 2,
            }),
        });

        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
        }

        const data = await resp.json();

        renderMarkdown(data.message);
        renderSources(data.sources || []);
        replaceCitationLinks(data.sources || []);

        divider.style.display = 'block';
        resultSec.classList.add('visible');
        setStatus(`DONE — ${(data.sources || []).length} SOURCES`);
    } catch (err) {
        setStatus('ERROR: ' + err.message, 'error');
    } finally {
        sendBtn.disabled = false;
    }
}

// ── Render markdown ───────────────────────────────────────────────────────
function renderMarkdown(text) {
    marked.setOptions({ breaks: true, gfm: true });
    mdOutput.innerHTML = marked.parse(text);
}

// ── Replace <a> tags with inline favicon badges ───────────────────────────
function replaceCitationLinks(sources) {
    // Build lookup by exact URL and by hostname
    const domainMap = {};
    sources.forEach(s => {
        domainMap[s.resolved_url] = s;
        domainMap[s.original_url] = s;
        try { domainMap[new URL(s.resolved_url).hostname] = s; } catch { }
    });

    mdOutput.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href') || '';
        let source = domainMap[href];
        if (!source) {
            try { source = domainMap[new URL(href).hostname]; } catch { }
        }

        if (source) {
            a.replaceWith(makeBadge(source, href));
        } else {
            a.style.color = 'var(--accent)';
        }
    });
}

function makeBadge(source, href) {
    const a = document.createElement('a');
    a.href = source.resolved_url || href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'cite-badge';
    a.title = source.label;

    if (source.favicon) {
        const img = document.createElement('img');
        img.src = source.favicon;
        img.alt = source.label;
        img.onerror = () => img.replaceWith(fallbackLabel(source.label));
        a.appendChild(img);
    } else {
        a.appendChild(fallbackLabel(source.label));
    }
    return a;
}

function fallbackLabel(label) {
    const span = document.createElement('span');
    span.className = 'fallback-label';
    span.textContent = (label || '?').slice(0, 2).toUpperCase();
    return span;
}

// ── Render sources list ────────────────────────────────────────────────────
function renderSources(sources) {
    if (!sources.length) return;
    srcList.innerHTML = '';

    sources.forEach((s, i) => {
        const a = document.createElement('a');
        a.href = s.resolved_url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'source-item';

        const idx = document.createElement('span');
        idx.className = 'src-idx';
        idx.textContent = String(i + 1).padStart(2, '0');
        a.appendChild(idx);

        if (s.favicon) {
            const img = document.createElement('img');
            img.src = s.favicon;
            img.alt = '';
            img.onerror = () => img.remove();
            a.appendChild(img);
        }

        const lbl = document.createElement('span');
        lbl.className = 'src-label';
        lbl.textContent = s.label;
        a.appendChild(lbl);

        srcList.appendChild(a);
    });

    srcSection.style.display = 'block';
}
