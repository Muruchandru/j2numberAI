const STORAGE_KEY = 'j2_mcboy_predictor_v2';

function loadData() {
  const def = { history: [], topEndings: ['07', '15', '58', '72', '94'], lastImportedAt: '' };
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || def;
  } catch {
    return def;
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateTopEndings(history) {
  const last6 = [...history].reverse().slice(0, 6);
  const freq = {};
  for (const entry of last6) {
    for (const num of entry.numbers || []) {
      if (num && num.length >= 2) {
        const ending = num.slice(-2);
        freq[ending] = (freq[ending] || 0) + 1;
      }
    }
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted.slice(0, 5).map(([ending]) => ending) : ['07', '15', '58', '72', '94'];
}

function getRecentWinners(history) {
  return [...history]
    .reverse()
    .slice(0, 6)
    .flatMap((entry) => (entry.numbers || []).slice(0, 3))
    .filter((winner) => winner && winner.length === 4);
}

function hybridEnding(firstEnding, secondEnding) {
  return (firstEnding?.[0] || '0') + (secondEnding?.[1] || '7');
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function generatePredictions(history, topEndings) {
  const winners = getRecentWinners(history);
  if (!winners.length || !topEndings.length) {
    return { pm3: [], pm9: [] };
  }

  const pm3 = new Set();
  const pm9 = new Set();

  for (let index = 0; index < 10 && pm3.size < 3; index += 1) {
    pm3.add(pick(winners).slice(0, 2) + pick(topEndings));
  }

  for (let index = 0; index < 10 && pm9.size < 3; index += 1) {
    const prefix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    pm9.add(prefix + hybridEnding(pick(topEndings), pick(topEndings)));
  }

  return { pm3: [...pm3].slice(0, 3), pm9: [...pm9].slice(0, 3) };
}

function renderPredictions(history, topEndings) {
  const area = document.getElementById('predictionsArea');
  if (!area) return;

  if (history.length < 4) {
    area.innerHTML = '<div class="empty-state"><div class="icon">⏳</div>Add at least 3 days (6 draws) for reliable predictions.</div>';
    return;
  }

  const prediction = generatePredictions(history, topEndings);
  if (!prediction.pm3.length) {
    area.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div>Not enough data yet. Keep adding results.</div>';
    return;
  }

  const numHtml = (numbers) => numbers.map((number, index) => `<div class="pred-num" style="animation-delay:${index * 0.08}s">${number}</div>`).join('');

  area.innerHTML = `
    <div class="pred-block">
      <div class="pred-label">🎰 3PM Draw – <span>Next</span></div>
      <div class="numbers-grid">${numHtml(prediction.pm3)}</div>
    </div>
    <div class="pred-block">
      <div class="pred-label">🎰 9PM Draw – <span>Next</span></div>
      <div class="numbers-grid">${numHtml(prediction.pm9)}</div>
    </div>
    <div style="margin-top:16px;">
      <div class="pred-label" style="margin-bottom:10px;">🔢 Top endings – last 3 days</div>
      <div class="endings-row">
        ${topEndings.map((ending) => `<span class="ending-chip">${ending}</span>`).join('')}
      </div>
    </div>
    <div class="budget-note">💰 Suggested budget: $6 ($1 per number) – Stop-loss: $100</div>
  `;
}

function renderHistory(history) {
  const element = document.getElementById('historyList');
  if (!element) return;

  if (!history.length) {
    element.innerHTML = '<div class="empty-state"><div class="icon">📭</div>No data yet.</div>';
    return;
  }

  element.innerHTML = [...history].reverse().slice(0, 10).map((entry) => `
    <div class="history-item">
      <div>
        <div class="history-date">${entry.date}</div>
        <div class="history-type">${entry.type === '3pm' ? '🎯 3PM' : '🎯 9PM'}</div>
      </div>
      <div class="history-nums">${(entry.numbers || []).slice(0, 8).join(' • ')}${(entry.numbers || []).length > 8 ? ' …' : ''}</div>
      <button class="btn btn-danger delete-entry-btn" data-id="${entry.id}" type="button">Delete</button>
    </div>
  `).join('');
}

function refreshAll() {
  const data = loadData();
  data.topEndings = updateTopEndings(data.history);
  saveData(data);
  renderHistory(data.history);
  renderPredictions(data.history, data.topEndings);
}

function addResult() {
  const date = document.getElementById('drawDate').value;
  const drawType = document.getElementById('drawType').value;
  const raw = document.getElementById('rawNumbers').value;

  if (!date) {
    showToast('🚫 Please select a date', 'error');
    return;
  }
  if (!raw.trim()) {
    showToast('🚫 Please enter winning numbers', 'error');
    return;
  }

  const numbers = raw.split(/[\s,\n]+/).map((item) => item.trim()).filter((item) => item.length === 4 && /^\d{4}$/.test(item));

  if (!numbers.length) {
    showToast('❌ No valid 4-digit numbers found', 'error');
    return;
  }

  const data = loadData();
  const existingEntry = data.history.find((entry) => entry.date === date && entry.type === drawType);

  if (existingEntry) {
    existingEntry.numbers = [...new Set([...existingEntry.numbers, ...numbers])];
  } else {
    data.history.push({ id: Date.now(), date, type: drawType, numbers });
  }

  data.history.sort((a, b) => new Date(a.date) - new Date(b.date));
  data.topEndings = updateTopEndings(data.history);
  saveData(data);

  document.getElementById('rawNumbers').value = '';
  document.getElementById('drawDate').value = '';
  refreshAll();
  showToast(`✅ Saved ${numbers.length} numbers for ${date} ${drawType}`, 'success');
}

function clearAll() {
  if (confirm('🔄 Delete ALL saved results and reset the app?')) {
    localStorage.removeItem(STORAGE_KEY);
    refreshAll();
    showToast('All data cleared.', '');
  }
}

function deleteHistoryEntry(entryId) {
  const data = loadData();
  const filtered = data.history.filter((entry) => entry.id !== entryId);
  if (filtered.length === data.history.length) return;
  data.history = filtered;
  data.topEndings = updateTopEndings(data.history);
  saveData(data);
  refreshAll();
  showToast('✅ Deleted selected result.', 'success');
}

function normalizeDate(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';

  const yearMonthDay = trimmed.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yearMonthDay) {
    return `${yearMonthDay[1]}-${String(yearMonthDay[2]).padStart(2, '0')}-${String(yearMonthDay[3]).padStart(2, '0')}`;
  }

  const dayMonthYear = trimmed.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dayMonthYear) {
    return `${dayMonthYear[3]}-${String(dayMonthYear[2]).padStart(2, '0')}-${String(dayMonthYear[1]).padStart(2, '0')}`;
  }

  return trimmed;
}

function getRecentDates(startDate, count = 10) {
  const dates = [];
  const current = new Date(startDate);
  if (Number.isNaN(current.getTime())) return dates;

  for (let index = 0; index < count; index += 1) {
    const date = new Date(current);
    date.setDate(current.getDate() - index);
    dates.push(date.toISOString().slice(0, 10));
  }

  return dates;
}

function extractNumbersFromText(content) {
  if (!content) return [];

  const normalize = (value) => value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'");
  const text = normalize(content);
  const matches = text.match(/\b\d{4}\b/g) || [];

  const seen = new Set();
  return matches.filter((match) => {
    if (seen.has(match)) return false;
    seen.add(match);
    return true;
  });
}

function extractDateFromText(content) {
  if (!content) return '';
  const text = content.replace(/<[^>]+>/g, ' ');
  const match = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/) || text.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (!match) return '';
  return normalizeDate(match[0]);
}

function parseResultsFromHtml(content) {
  if (!content) return [];

  const entries = [];
  const seen = new Set();
  const outerBoxRegex = /<div\b[^>]*class=["'][^"']*\bouterbox\b[^"']*["'][^>]*>/gi;
  let match;

  while ((match = outerBoxRegex.exec(content)) !== null) {
    const blockStart = match.index + match[0].length;
    const divRegex = /<\/?div\b[^>]*>/gi;
    divRegex.lastIndex = blockStart;

    let depth = 1;
    let blockEnd = -1;
    let divMatch;

    while ((divMatch = divRegex.exec(content)) !== null) {
      const tag = divMatch[0];
      if (tag.startsWith('</div')) {
        depth -= 1;
        if (depth === 0) {
          blockEnd = divMatch.index;
          break;
        }
      } else if (tag.startsWith('<div') && !tag.startsWith('</')) {
        depth += 1;
      }
    }

    if (blockEnd === -1) continue;

    const blockHtml = content.slice(blockStart, blockEnd);
    const labelText = blockHtml.match(/Jaguar\s+(J|G)\s*\((3pm|9pm)\)/i)?.[0] || '';
    const type = /jaguar\s+j/i.test(labelText) ? '3pm' : /jaguar\s+g/i.test(labelText) ? '9pm' : '3pm';
    const dateText = blockHtml.match(/Date:\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i) || blockHtml.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    const date = normalizeDate(dateText?.[1] || dateText?.[0] || '');

    if (!date) continue;

    const numbers = (blockHtml.match(/\b\d{4}\b/g) || [])
      .filter((number) => /^\d{4}$/.test(number) && !/^20\d{2}$/.test(number));

    const uniqueNumbers = [...new Set(numbers)];
    if (!uniqueNumbers.length) continue;

    const key = `${date}-${type}`;
    if (seen.has(key)) continue;
    seen.add(key);

    entries.push({ date, type, numbers: uniqueNumbers });
  }

  if (!entries.length) {
    const fallbackNumbers = (content.match(/\b\d{4}\b/g) || []).filter((number) => /^\d{4}$/.test(number) && !/^20\d{2}$/.test(number));
    if (fallbackNumbers.length) {
      const today = new Date().toISOString().slice(0, 10);
      return [{ date: today, type: '3pm', numbers: [...new Set(fallbackNumbers)] }];
    }
  }

  return entries;
}

function extractDateLinksFromHtml(content) {
  if (!content) return [];

  const dates = [];
  const seen = new Set();
  const linkMatches = content.match(/<a[^>]*>(\d{4}-\d{2}-\d{2})<\/a>/gi) || [];

  for (const match of linkMatches) {
    const text = match.match(/>(\d{4}-\d{2}-\d{2})</i)?.[1];
    if (!text || seen.has(text)) continue;
    seen.add(text);
    dates.push(text);
  }

  return dates;
}

function buildImportUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  const target = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return `/proxy?url=${encodeURIComponent(target)}`;
}

function buildPublicProxyUrls(target) {
  // return a list of alternative public proxy endpoints that return raw HTML
  // try allorigins, then jina.ai raw proxy
  return [
    `/proxy?url=${encodeURIComponent(target)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
    `https://r.jina.ai/http://${target.replace(/^https?:\/\//i, '')}`,
  ];
}

async function fetchWithFallback(target, options = {}) {
  const urls = buildPublicProxyUrls(target);
  let lastError = null;
  for (const url of urls) {
    try {
      const resp = await fetch(url, options);
      if (!resp.ok) throw new Error(`Status ${resp.status} for ${url}`);
      return resp;
    } catch (err) {
      lastError = err;
      // try next
    }
  }
  throw lastError || new Error('All proxy attempts failed');
}

function buildDateUrl(baseUrl, date) {
  if (!baseUrl || !date) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}date=${encodeURIComponent(date)}`;
}

async function importFromLink() {
  const input = document.getElementById('importUrl');
  const url = input?.value?.trim();

  if (!url) {
    showToast('🔗 Please enter a link first', 'error');
    return;
  }

  showToast('⏳ Importing recent and past results…', '');

  try {
    const baseUrl = /^(https?:\/\/)/i.test(url) ? url : `https://${url}`;
    const proxyUrl = buildImportUrl(baseUrl);
    const response = await fetch(proxyUrl, { headers: { Accept: 'text/html,application/json,text/plain' } });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    const content = await response.text();
    const pageEntries = parseResultsFromHtml(content);
    console.log('import pageEntries', pageEntries);
    if (!pageEntries.length) {
      throw new Error('No result blocks were found in the provided link.');
    }

    const specificDateMatch = baseUrl.match(/[?&]date=(\d{4}-\d{2}-\d{2})/);
    const isSpecificDatePage = Boolean(specificDateMatch);
    const pagesToFetch = [];
    const seenDates = new Set();

    for (const entry of pageEntries) {
      if (!seenDates.has(entry.date)) {
        seenDates.add(entry.date);
        pagesToFetch.push(entry.date);
      }
    }

    if (!isSpecificDatePage) {
      const dates = extractDateLinksFromHtml(content);
      for (const date of dates.slice(0, 10)) {
        if (!seenDates.has(date)) {
          seenDates.add(date);
          pagesToFetch.push(date);
        }
      }

      if (pagesToFetch.length < 10) {
        const fallbackStart = pageEntries[0]?.date || dates[0] || new Date().toISOString().slice(0, 10);
        for (const date of getRecentDates(fallbackStart, 10)) {
          if (!seenDates.has(date)) {
            seenDates.add(date);
            pagesToFetch.push(date);
          }
        }
      }
    }

    const fetchedEntries = [];
    const urlsToFetch = pagesToFetch.slice(0, 10).map((date) => {
      if (date === (pageEntries[0]?.date || '')) return baseUrl;
      return buildDateUrl(baseUrl, date);
    });

    for (const pageUrl of urlsToFetch) {
      if (isSpecificDatePage && pageUrl !== baseUrl) continue;
      try {
        const pageResponse = await fetch(buildImportUrl(pageUrl), { headers: { Accept: 'text/html,application/json,text/plain' } });
        if (!pageResponse.ok) continue;
        const pageContent = await pageResponse.text();
        let parsedEntries = parseResultsFromHtml(pageContent);
        const dateMatch = pageUrl.match(/[?&]date=([^&]+)/);
        if (dateMatch && dateMatch[1]) {
          const forced = decodeURIComponent(dateMatch[1]);
          parsedEntries = parsedEntries.map((e) => ({ ...e, date: forced }));
        }
        console.log('import fetched', pageUrl, parsedEntries);
        fetchedEntries.push(...parsedEntries);
      } catch (err) {
        console.warn('failed to fetch page', pageUrl, err);
        continue;
      }
    }

    const mergedEntries = [...pageEntries, ...fetchedEntries];
    const uniqueEntries = [];
    const entryKeys = new Set();

    for (const entry of mergedEntries) {
      const key = `${entry.date}-${entry.type}`;
      if (entryKeys.has(key)) continue;
      entryKeys.add(key);
      uniqueEntries.push(entry);
    }

    if (!uniqueEntries.length) {
      throw new Error('No valid draw results were found.');
    }

    const data = loadData();
    for (const entry of uniqueEntries) {
      const existingEntry = data.history.find((item) => item.date === entry.date && item.type === entry.type);
      if (existingEntry) {
        existingEntry.numbers = [...new Set([...existingEntry.numbers, ...entry.numbers])];
      } else {
        data.history.push({ id: Date.now() + Math.random(), date: entry.date, type: entry.type, numbers: entry.numbers });
      }
    }

    data.history.sort((a, b) => new Date(a.date) - new Date(b.date));
    data.topEndings = updateTopEndings(data.history);
    saveData(data);
    // record last successful import date (YYYY-MM-DD)
    try {
      const meta = loadData();
      meta.lastImportedAt = new Date().toISOString().slice(0, 10);
      saveData(meta);
    } catch (e) {
      // ignore
    }

    if (input) input.value = '';
    refreshAll();
    showToast(`✅ Imported ${uniqueEntries.length} draw entries from the link`, 'success');
  } catch (error) {
    console.error(error);
    showToast('⚠️ Could not read the link. Try a direct results page or a page with visible draw data.', 'error');
  }
}

async function autoImportIfNeeded() {
  const data = loadData();
  const today = new Date().toISOString().slice(0, 10);
  if (data.lastImportedAt === today) return; // already imported today

  try {
    await importFromLink();
  } catch (err) {
    console.warn('auto import failed', err);
  }
}

function initApp() {
  refreshAll();
  const saveButton = document.getElementById('saveBtn');
  const clearButton = document.getElementById('clearHistoryBtn');
  const deleteAllHistoryBtn = document.getElementById('deleteAllHistoryBtn');
  const refreshButton = document.getElementById('refreshBtn');
  const importButton = document.getElementById('importBtn');

  if (saveButton) saveButton.addEventListener('click', addResult);
  if (clearButton) clearButton.addEventListener('click', clearAll);
  if (deleteAllHistoryBtn) deleteAllHistoryBtn.addEventListener('click', clearAll);
  if (refreshButton) refreshButton.addEventListener('click', refreshAll);
  if (importButton) importButton.addEventListener('click', importFromLink);

  const historyList = document.getElementById('historyList');
  if (historyList) {
    historyList.addEventListener('click', (event) => {
      const button = event.target.closest('.delete-entry-btn');
      if (!button) return;
      const id = parseFloat(button.dataset.id);
      if (!Number.isNaN(id)) deleteHistoryEntry(id);
    });
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initApp);
}

if (typeof module !== 'undefined') {
  module.exports = {
    extractDateFromText,
    extractNumbersFromText,
    normalizeDate,
    parseResultsFromHtml,
    extractDateLinksFromHtml,
    updateTopEndings,
    generatePredictions,
  };
}
