document.getElementById('content-font-size').addEventListener('input', updateAllAndSync);
document.getElementById('content-color').addEventListener('input', updateAllAndSync);
document.getElementById('content-line-height').addEventListener('input', updateAllAndSync);
document.getElementById('content-padding').addEventListener('input', updateAllAndSync);
document.getElementById('content-bg').addEventListener('input', updateAllAndSync);
document.getElementById('rt-opacity').addEventListener('input', updateAllAndSync);
document.getElementById('rt-color').addEventListener('input', updateAllAndSync);
const rtFontSizeInput = document.getElementById('rt-font-size');
const rtFontSizeValue = document.getElementById('rt-font-size-value');
rtFontSizeInput.addEventListener('input', function() {
    rtFontSizeValue.textContent = rtFontSizeInput.value;
    updateAllAndSync();
});
document.getElementById('content-ratio').addEventListener('change', updateAllAndSync);
document.getElementById('content-font-family').addEventListener('change', updateAllAndSync);
// Extracted from index.html
// All main logic for furigana-maker

// --- Content reference declarations ---
const contentDiv = document.getElementById('content');
let overlayTextarea = null;
let kanjiDict = {};
let fullWordMap = {};
let okuriganaKanjiSet = new Set();

// Load dictionary and preprocess
async function loadKanjiDict() {
    if (Object.keys(kanjiDict).length === 0) {
        const data = await fetch('kanji_to_hiragana.json').then(res => res.json());
        kanjiDict = data;
        // Build fullWordMap and okuriganaKanjiSet
        fullWordMap = kanjiDict;
        for (const word of Object.keys(kanjiDict)) {
            if (/^[\u4E00-\u9FFF]+$/.test(word)) continue; // pure kanji only
            // Okurigana: starts with kanji, ends with kana
            if (/^[\u4E00-\u9FFF]+[\u3040-\u309F]+$/.test(word)) {
                okuriganaKanjiSet.add(word[0]);
            }
        }
    }
}

// --- Kanji word click-to-select pronunciation logic ---

// Unified function: loads dict if needed, returns readings for a word (array or undefined)
async function getKanjiReadings(word) {
    if (Object.keys(kanjiDict).length === 0) {
        const data = await fetch('kanji_to_hiragana.json').then(res => res.json());
        kanjiDict = data;
    }
    return kanjiDict[word];
}

function isKanji(str) {
    return /^[一-龯]+$/.test(str);
}

function createPronunciationDropdown(triggerEl, kanjiWord, currentRt) {
    getKanjiReadings(kanjiWord).then(readings => {
        if (!readings) return;
        document.querySelectorAll('.pron-dropdown').forEach(e => {
            e.remove();
            document.querySelectorAll('ruby.active-pron').forEach(r => r.classList.remove('active-pron'));
        });
        triggerEl.classList.add('active-pron');
        const dropdown = document.createElement('select');
        dropdown.className = 'pron-dropdown';
        dropdown.style.position = 'absolute';
        dropdown.style.zIndex = 2000;
        dropdown.style.fontSize = '1em';
        dropdown.style.background = '#fff';
        dropdown.style.border = '1px solid #b27070';
        dropdown.style.borderRadius = '6px';
        dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        dropdown.style.padding = '0.2em 0.5em';

        let removed = false;
        function removeDropdown() {
            if (!removed) {
                removed = true;
                if (dropdown.parentNode) dropdown.remove();
                triggerEl.classList.remove('active-pron');
            }
        }

        readings.forEach(reading => {
            const opt = document.createElement('option');
            opt.value = reading;
            opt.textContent = reading;
            if (reading === currentRt) opt.selected = true;
            dropdown.appendChild(opt);
        });
        const rect = triggerEl.getBoundingClientRect();
        dropdown.style.left = rect.left + window.scrollX + 'px';
        dropdown.style.top = rect.bottom + window.scrollY + 'px';
        document.body.appendChild(dropdown);
        dropdown.focus();
        dropdown.addEventListener('change', function() {
            if (triggerEl.matches('ruby')) {
                triggerEl.querySelector('rt').textContent = dropdown.value;
            } else {
                triggerEl.dataset.reading = dropdown.value;
                triggerEl.querySelector('rt').textContent = dropdown.value.slice(triggerEl.querySelector('.okurigana').textContent.length);
            }
            removeDropdown();
        });
        dropdown.addEventListener('blur', removeDropdown);
    });
}

contentDiv.addEventListener('click', function(e) {
    if (overlayTextarea) return;
    // Prioritize okurigana-group for pronunciation dropdown
    let okuriganaGroupEl = e.target.closest('.okurigana-group');
    if (okuriganaGroupEl) {
        // Use the whole okurigana-group text for lookup
        const groupText = okuriganaGroupEl.dataset.okurigana;
        const currentRt = okuriganaGroupEl.dataset.reading;
        if (fullWordMap[groupText]) {
            createPronunciationDropdown(okuriganaGroupEl, groupText, currentRt);
            e.stopPropagation();
            return;
        }
    }
    // Only handle ruby clicks if not inside okurigana-group
    let rubyEl = e.target.closest('ruby');
    if (rubyEl && !e.target.closest('.okurigana-group')) {
        const kanjiWord = rubyEl.childNodes[0].textContent;
        const currentRt = rubyEl.querySelector('rt')?.textContent || '';
        if (isKanji(kanjiWord)) {
            createPronunciationDropdown(rubyEl, kanjiWord, currentRt);
            e.stopPropagation();
            return;
        }
    }
});

// --- Palette definitions ---
function syncSettingsToUrl() {
    const params = new URLSearchParams(window.location.search);
    params.set('ratio', document.getElementById('content-ratio').value);
    params.set('fontFamily', document.getElementById('content-font-family').value);
    params.set('fontSize', document.getElementById('content-font-size').value);
    params.set('color', document.getElementById('content-color').value);
    params.set('lineHeight', document.getElementById('content-line-height').value);
    params.set('padding', document.getElementById('content-padding').value);
    params.set('bg', document.getElementById('content-bg').value);
    params.set('rtOpacity', document.getElementById('rt-opacity').value);
    params.set('rtColor', document.getElementById('rt-color').value);
    params.set('rtFontSize', document.getElementById('rt-font-size').value);
    history.replaceState(null, '', '?' + params.toString());
}
function splitByScript(text) {
    return text.match(/([\u4E00-\u9FFF]+|[\u3040-\u309F]+|[\u30A0-\u30FF]+|[^\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]+)/g);
}

async function generateRubyHtmlFromJapanese(text) {
    await loadKanjiDict();
    const segments = splitByScript(text);
    let html = '';
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        // Try full word match first
        if (fullWordMap[segment] && segment.length > 1) {
            html += `<ruby>${segment}<rt>${fullWordMap[segment][0]}</rt></ruby>`;
            continue;
        }
        // If segment starts with okurigana kanji, try to combine with following kana
        if (okuriganaKanjiSet.has(segment[0]) && /[\u4E00-\u9FFF]/.test(segment[0])) {
            let nextSegment = segments[i + 1];
            if (nextSegment && /[\u3040-\u309F]+/.test(nextSegment)) {
                let found = false;
                for (let k = 1; k <= nextSegment.length; k++) {
                    let combined = segment + nextSegment.slice(0, k);
                    if (fullWordMap[combined]) {
                        const reading = fullWordMap[combined][0].slice(0, -k);
                        html += `<span class="okurigana-group" data-okurigana="${combined}" data-reading="${reading}"><ruby>${segment}<rt>${reading}</rt></ruby><span class="okurigana">${nextSegment.slice(0, k)}</span></span>`;
                        if (k < nextSegment.length) {
                            html += nextSegment.slice(k);
                        }
                        i++; // advance index to skip the kana segment
                        found = true;
                        break;
                    }
                }
                if (found) continue;
            }
        }
        // Fallback: single kanji
        for (const chr of segment) {
            if (fullWordMap[chr]) {
                html += `<ruby>${chr}<rt>${fullWordMap[chr][0]}</rt></ruby>`;
            } else {
                html += chr;
            }
        }
    }
    return html;
}
async function restoreSettingsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('ratio')) document.getElementById('content-ratio').value = params.get('ratio');
    if (params.has('fontFamily')) document.getElementById('content-font-family').value = params.get('fontFamily');
    if (params.has('fontSize')) document.getElementById('content-font-size').value = params.get('fontSize');
    if (params.has('color')) document.getElementById('content-color').value = params.get('color');
    if (params.has('lineHeight')) document.getElementById('content-line-height').value = params.get('lineHeight');
    if (params.has('padding')) document.getElementById('content-padding').value = params.get('padding');
    if (params.has('bg')) document.getElementById('content-bg').value = params.get('bg');
    if (params.has('rtOpacity')) document.getElementById('rt-opacity').value = params.get('rtOpacity');
    if (params.has('rtColor')) document.getElementById('rt-color').value = params.get('rtColor');
    if (params.has('rtFontSize')) {
        document.getElementById('rt-font-size').value = params.get('rtFontSize');
        document.getElementById('rt-font-size-value').textContent = params.get('rtFontSize');
    }
    if (params.has('content')) {
        const rawContent = decodeURIComponent(params.get('content'));
        // Try to generate ruby HTML for Japanese text
        document.getElementById('content').innerHTML = await generateRubyHtmlFromJapanese(rawContent);
    }
}
function updateContentStyle() {
    const content = document.getElementById('content');
    content.style.fontSize = document.getElementById('content-font-size').value + 'px';
    content.style.color = document.getElementById('content-color').value;
    content.style.lineHeight = document.getElementById('content-line-height').value;
    content.style.padding = document.getElementById('content-padding').value + 'em';
    content.style.background = document.getElementById('content-bg').value;
    content.style.fontFamily = document.getElementById('content-font-family').value;
}

function updateContentRatio() {
    const ratio = document.getElementById('content-ratio').value;
    contentDiv.style.aspectRatio = ratio;
}

function updateRtStyle() {
    const rts = document.querySelectorAll('#content rt');
    const opacity = document.getElementById('rt-opacity').value;
    const color = document.getElementById('rt-color').value;
    const fontSize = document.getElementById('rt-font-size').value;
    rts.forEach(rt => {
        rt.style.opacity = (opacity/100).toString();
        rt.style.color = color;
        rt.style.fontSize = fontSize + '%';
    });
}

function updateAllAndSync() {
    updateContentStyle();
    updateRtStyle();
    updateContentRatio();
    syncSettingsToUrl();
}
const palettes = {
    tokyo: {
        name: 'Tokyo Night',
        bg: '#1a1b26',
        fg: '#c0caf5',
        accent: '#7aa2f7',
        ruby: '#bb9af7',
        font: "'Noto Sans JP', sans-serif",
        rtOpacity: 55,
        rtFontSize: 42,
        lineHeight: 2.6,
        fontSize: 43
    },
    fuji: {
        name: 'Mount Fuji',
        bg: '#eaf6fb',
        fg: '#2d3a4a',
        accent: '#a0c4e3',
        ruby: '#5e81ac',
        font: "'Meiryo', sans-serif",
        rtOpacity: 45,
        rtFontSize: 41,
        lineHeight: 2.5,
        fontSize: 42
    },
    kyoto: {
        name: 'Kyoto Otera',
        bg: '#f7f3e9',
        fg: '#7c5c3e',
        accent: '#c9b79c',
        ruby: '#b48e5c',
        font: "'Yu Mincho', serif",
        rtOpacity: 42,
        rtFontSize: 39,
        lineHeight: 2.7,
        fontSize: 41
    },
    sakura: {
        name: 'Sakura',
        bg: '#fff7f7',
        fg: '#b27070',
        accent: '#e7b8b8',
        ruby: '#a85c5c',
        font: "'Hiragino Sans', sans-serif",
        rtOpacity: 40,
        rtFontSize: 40,
        lineHeight: 2.5,
        fontSize: 42
    },
    night: {
        name: 'Night Sky',
        bg: '#23233a',
        fg: '#e7e7fa',
        accent: '#4a4a6a',
        ruby: '#b2b2ff',
        font: "'Noto Sans JP', sans-serif",
        rtOpacity: 60,
        rtFontSize: 45,
        lineHeight: 2.7,
        fontSize: 44
    },
    matcha: {
        name: 'Matcha',
        bg: '#f7fff7',
        fg: '#4a6a4a',
        accent: '#b2d8b2',
        ruby: '#6a8a6a',
        font: "'Yu Mincho', serif",
        rtOpacity: 38,
        rtFontSize: 38,
        lineHeight: 2.6,
        fontSize: 40
    },
    classic: {
        name: 'Classic Paper',
        bg: '#fcf8ed',
        fg: '#444',
        accent: '#e7e7d7',
        ruby: '#b27070',
        font: "'Meiryo', sans-serif",
        rtOpacity: 40,
        rtFontSize: 40,
        lineHeight: 2.5,
        fontSize: 42
    }
};

function applyPalette(paletteKey) {
    if (!palettes[paletteKey]) return;
    const p = palettes[paletteKey];
    // Update content card styles
    contentDiv.style.background = p.bg;
    contentDiv.style.color = p.fg;
    contentDiv.style.fontFamily = p.font;
    contentDiv.style.lineHeight = p.lineHeight;
    contentDiv.style.fontSize = p.fontSize + 'px';
    // Update controls
    document.getElementById('content-bg').value = p.bg;
    document.getElementById('content-color').value = p.fg;
    document.getElementById('content-font-family').value = p.font;
    document.getElementById('content-line-height').value = p.lineHeight;
    document.getElementById('content-font-size').value = p.fontSize;
    // Ruby styles
    document.getElementById('rt-color').value = p.ruby;
    document.getElementById('rt-opacity').value = p.rtOpacity;
    document.getElementById('rt-font-size').value = p.rtFontSize;
    document.getElementById('rt-font-size-value').textContent = p.rtFontSize;
    updateAllAndSync();
}

document.getElementById('palette').addEventListener('change', function() {
    const val = this.value;
    if (val === 'custom') return;
    applyPalette(val);
});

// Collapse/expand controls logic
const controlsDiv = document.getElementById('controls');
const toggleBtn = document.getElementById('toggle-controls-btn');
const toggleIcon = document.getElementById('toggle-controls-icon');

document.getElementById('rt-opacity').addEventListener('input', updateAllAndSync);

window.onload = function() {
    restoreSettingsFromUrl().then(updateAllAndSync);
};
