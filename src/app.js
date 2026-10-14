import {
  getProfile,
  saveProfile,
  getNextQuoteNumber,
  incrementQuoteNumber,
  getHistory,
  saveToHistory,
  deleteFromHistory,
  saveDraft,
  loadDraft
} from './storage.js';

import {
  formatUSD,
  generatePDFDoc,
  getPDFBlob,
  downloadPDF,
  sharePDF
} from './pdf.js';

// Application State
let state = {
  id: Date.now().toString(),
  type: 'QUOTE', // 'QUOTE' or 'INVOICE'
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  quoteNumber: getNextQuoteNumber('QUOTE'),
  date: new Date().toISOString().split('T')[0],
  dueDate: '',
  items: [
    { id: 1, description: 'CCTV Camera System & Cabling Installation', qty: 1, price: 650 }
  ],
  discount: 0,
  taxPercent: 0,
  depositPercent: 50,
  notes: ''
};

let profile = getProfile();

// DOM Elements
const elements = {
  headerBusinessName: document.getElementById('headerBusinessName'),
  headerTagline: document.getElementById('headerTagline'),
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusText'),
  btnTypeQuote: document.getElementById('btnTypeQuote'),
  btnTypeInvoice: document.getElementById('btnTypeInvoice'),
  docMetaTitle: document.getElementById('docMetaTitle'),
  lblDocNumber: document.getElementById('lblDocNumber'),
  lblDocDue: document.getElementById('lblDocDue'),
  customerName: document.getElementById('customerName'),
  customerPhone: document.getElementById('customerPhone'),
  customerAddress: document.getElementById('customerAddress'),
  quoteNumber: document.getElementById('quoteNumber'),
  quoteDate: document.getElementById('quoteDate'),
  quoteDueDate: document.getElementById('quoteDueDate'),
  itemsList: document.getElementById('itemsList'),
  btnAddItem: document.getElementById('btnAddItem'),
  summarySubtotal: document.getElementById('summarySubtotal'),
  inputDiscount: document.getElementById('inputDiscount'),
  inputTax: document.getElementById('inputTax'),
  inputDeposit: document.getElementById('inputDeposit'),
  summaryGrandTotal: document.getElementById('summaryGrandTotal'),
  depositRow: document.getElementById('depositRow'),
  depositLabel: document.getElementById('depositLabel'),
  summaryDeposit: document.getElementById('summaryDeposit'),
  quoteNotes: document.getElementById('quoteNotes'),
  btnPreview: document.getElementById('btnPreview'),
  btnDownload: document.getElementById('btnDownload'),
  btnShare: document.getElementById('btnShare'),
  btnNewQuote: document.getElementById('btnNewQuote'),
  btnOpenProfile: document.getElementById('btnOpenProfile'),
  btnOpenHistory: document.getElementById('btnOpenHistory'),
  toastMessage: document.getElementById('toastMessage'),

  // Modals
  modalProfile: document.getElementById('modalProfile'),
  btnCloseProfile: document.getElementById('btnCloseProfile'),
  btnSaveProfile: document.getElementById('btnSaveProfile'),
  profBusinessName: document.getElementById('profBusinessName'),
  profTagline: document.getElementById('profTagline'),
  profPhone: document.getElementById('profPhone'),
  profEmail: document.getElementById('profEmail'),
  profAddress: document.getElementById('profAddress'),
  profPaymentInfo: document.getElementById('profPaymentInfo'),
  profDefaultTerms: document.getElementById('profDefaultTerms'),

  modalHistory: document.getElementById('modalHistory'),
  btnCloseHistory: document.getElementById('btnCloseHistory'),
  btnCloseHistoryFooter: document.getElementById('btnCloseHistoryFooter'),
  historyListContainer: document.getElementById('historyListContainer'),

  modalPreview: document.getElementById('modalPreview'),
  btnClosePreview: document.getElementById('btnClosePreview'),
  previewIframe: document.getElementById('previewIframe'),
  btnDownloadFromPreview: document.getElementById('btnDownloadFromPreview'),
  btnShareFromPreview: document.getElementById('btnShareFromPreview')
};

// Show Toast
function showToast(msg) {
  elements.toastMessage.textContent = msg;
  elements.toastMessage.classList.add('show');
  setTimeout(() => {
    elements.toastMessage.classList.remove('show');
  }, 2500);
}

// Update Network / Offline Badge
function updateOnlineStatus() {
  if (navigator.onLine) {
    elements.statusBadge.className = 'status-pill online';
    elements.statusText.textContent = '⚡ 100% Offline Ready';
  } else {
    elements.statusBadge.className = 'status-pill offline';
    elements.statusText.textContent = '📴 Offline Mode Active';
  }
}

// Calculate Default Due Date (+14 days)
function calculateDefaultDueDate(baseDateStr) {
  try {
    const d = new Date(baseDateStr || Date.now());
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

// Render Line Items
function renderItems() {
  elements.itemsList.innerHTML = '';
  
  if (state.items.length === 0) {
    elements.itemsList.innerHTML = `
      <div style="text-align: center; color: var(--slate-400); padding: 16px;">
        No items added yet. Tap <strong>+ Add Another Item</strong> or use a preset above!
      </div>
    `;
    updateTotals();
    return;
  }

  state.items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'item-card';

    const lineTotal = (Number(item.qty) || 1) * (Number(item.price) || 0);

    card.innerHTML = `
      <div class="item-card-top">
        <input type="text" class="item-card-desc" value="${escapeHtml(item.description || '')}" placeholder="Item / Service description..." data-id="${item.id}" data-field="description">
        <button type="button" class="item-delete-btn" title="Remove Item" data-id="${item.id}">&times;</button>
      </div>
      <div class="item-card-bottom">
        <div>
          <label style="font-size: 0.72rem; margin-bottom: 2px;">Qty</label>
          <input type="number" min="1" step="1" value="${item.qty}" data-id="${item.id}" data-field="qty">
        </div>
        <div>
          <label style="font-size: 0.72rem; margin-bottom: 2px;">Price ($)</label>
          <div class="input-with-symbol">
            <span class="input-symbol">$</span>
            <input type="number" min="0" step="0.5" value="${item.price}" data-id="${item.id}" data-field="price">
          </div>
        </div>
        <div>
          <label style="font-size: 0.72rem; margin-bottom: 2px; text-align: right; display: block;">Total</label>
          <div class="item-line-total">${formatUSD(lineTotal)}</div>
        </div>
      </div>
    `;

    elements.itemsList.appendChild(card);
  });

  // Attach Item Event Listeners
  elements.itemsList.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const id = Number(e.target.dataset.id);
      const field = e.target.dataset.field;
      const val = e.target.value;
      const targetItem = state.items.find(i => i.id === id);
      if (targetItem) {
        if (field === 'qty' || field === 'price') {
          targetItem[field] = Number(val) || 0;
          // Update the line total display
          const card = e.target.closest('.item-card');
          const totalEl = card.querySelector('.item-line-total');
          const newLineTotal = (Number(targetItem.qty) || 1) * (Number(targetItem.price) || 0);
          totalEl.textContent = formatUSD(newLineTotal);
        } else {
          targetItem[field] = val;
        }
        updateTotals();
        saveDraftState();
      }
    });
  });

  elements.itemsList.querySelectorAll('.item-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      state.items = state.items.filter(i => i.id !== id);
      renderItems();
      saveDraftState();
    });
  });

  updateTotals();
}

// Calculate and Update Totals
function updateTotals() {
  const subtotal = state.items.reduce((sum, item) => {
    return sum + ((Number(item.qty) || 1) * (Number(item.price) || 0));
  }, 0);

  const discount = Number(state.discount) || 0;
  const taxPercent = Number(state.taxPercent) || 0;
  const depositPercent = Number(state.depositPercent) || 0;

  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = (taxable * taxPercent) / 100;
  const grandTotal = taxable + taxAmount;
  const depositAmount = (grandTotal * depositPercent) / 100;

  state.subtotal = subtotal;
  state.total = grandTotal;

  elements.summarySubtotal.textContent = formatUSD(subtotal);
  elements.summaryGrandTotal.textContent = formatUSD(grandTotal);

  if (depositPercent > 0) {
    elements.depositRow.style.display = 'flex';
    elements.depositLabel.textContent = `${depositPercent}% Deposit Required:`;
    elements.summaryDeposit.textContent = formatUSD(depositAmount);
  } else {
    elements.depositRow.style.display = 'none';
  }
}

// Save Current Draft
function saveDraftState() {
  state.customerName = elements.customerName.value;
  state.customerPhone = elements.customerPhone.value;
  state.customerAddress = elements.customerAddress.value;
  state.quoteNumber = elements.quoteNumber.value;
  state.date = elements.quoteDate.value;
  state.dueDate = elements.quoteDueDate.value;
  state.discount = Number(elements.inputDiscount.value) || 0;
  state.taxPercent = Number(elements.inputTax.value) || 0;
  state.depositPercent = Number(elements.inputDeposit.value) || 0;
  state.notes = elements.quoteNotes.value;

  saveDraft(state);
}

// Reset Form to New Blank Quote
function resetToNewQuote() {
  const newNum = getNextQuoteNumber(state.type);
  const today = new Date().toISOString().split('T')[0];
  
  state = {
    id: Date.now().toString(),
    type: state.type,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    quoteNumber: newNum,
    date: today,
    dueDate: calculateDefaultDueDate(today),
    items: [
      { id: Date.now(), description: '', qty: 1, price: 0 }
    ],
    discount: 0,
    taxPercent: 0,
    depositPercent: 50,
    notes: profile.defaultTerms || ''
  };

  syncStateToInputs();
  renderItems();
  saveDraftState();
  showToast('Started new blank document');
}

// Sync State into DOM inputs
function syncStateToInputs() {
  elements.customerName.value = state.customerName || '';
  elements.customerPhone.value = state.customerPhone || '';
  elements.customerAddress.value = state.customerAddress || '';
  elements.quoteNumber.value = state.quoteNumber || getNextQuoteNumber(state.type);
  elements.quoteDate.value = state.date || new Date().toISOString().split('T')[0];
  elements.quoteDueDate.value = state.dueDate || calculateDefaultDueDate(state.date);
  elements.inputDiscount.value = state.discount || '';
  elements.inputTax.value = state.taxPercent || '';
  elements.inputDeposit.value = state.depositPercent !== undefined ? state.depositPercent.toString() : '50';
  elements.quoteNotes.value = state.notes !== undefined ? state.notes : (profile.defaultTerms || '');

  // Toggle buttons
  if (state.type === 'INVOICE') {
    elements.btnTypeInvoice.classList.add('active');
    elements.btnTypeQuote.classList.remove('active');
    elements.docMetaTitle.textContent = '📄 Invoice Details';
    elements.lblDocNumber.textContent = 'Invoice #';
    elements.lblDocDue.textContent = 'Payment Due Date';
  } else {
    elements.btnTypeQuote.classList.add('active');
    elements.btnTypeInvoice.classList.remove('active');
    elements.docMetaTitle.textContent = '📄 Quote Details';
    elements.lblDocNumber.textContent = 'Quote #';
    elements.lblDocDue.textContent = 'Valid Until (Expiry)';
  }
}

// Update Profile in Header & UI
function applyProfile() {
  elements.headerBusinessName.textContent = profile.businessName || 'One Man and a Team';
  elements.headerTagline.textContent = profile.tagline || 'CCTV • Building • Mechanical';
}

// Helpers
function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Setup Event Listeners
function initEventListeners() {
  // Offline detection
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Document Type Switcher
  elements.btnTypeQuote.addEventListener('click', () => {
    state.type = 'QUOTE';
    if (!state.quoteNumber || state.quoteNumber.startsWith('INV-')) {
      state.quoteNumber = getNextQuoteNumber('QUOTE');
    }
    syncStateToInputs();
    saveDraftState();
  });

  elements.btnTypeInvoice.addEventListener('click', () => {
    state.type = 'INVOICE';
    if (!state.quoteNumber || state.quoteNumber.startsWith('OMT-')) {
      state.quoteNumber = getNextQuoteNumber('INVOICE');
    }
    syncStateToInputs();
    saveDraftState();
  });

  // Input changes
  const liveInputs = [
    elements.customerName,
    elements.customerPhone,
    elements.customerAddress,
    elements.quoteNumber,
    elements.quoteDate,
    elements.quoteDueDate,
    elements.inputDiscount,
    elements.inputTax,
    elements.inputDeposit,
    elements.quoteNotes
  ];

  liveInputs.forEach(input => {
    input.addEventListener('input', () => {
      saveDraftState();
      updateTotals();
    });
  });

  elements.quoteDate.addEventListener('change', () => {
    elements.quoteDueDate.value = calculateDefaultDueDate(elements.quoteDate.value);
    saveDraftState();
  });

  // Add Item Button
  elements.btnAddItem.addEventListener('click', () => {
    state.items.push({
      id: Date.now(),
      description: '',
      qty: 1,
      price: 0
    });
    renderItems();
    saveDraftState();
    // Focus last item description
    const lastInput = elements.itemsList.querySelector('.item-card:last-child .item-card-desc');
    if (lastInput) lastInput.focus();
  });

  // Preset Chips
  document.querySelectorAll('.chip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const desc = btn.dataset.desc;
      const price = Number(btn.dataset.price) || 0;
      state.items.push({
        id: Date.now(),
        description: desc,
        qty: 1,
        price: price
      });
      renderItems();
      saveDraftState();
      showToast(`Added: ${desc.split(' ')[0]}...`);
    });
  });

  // New Quote Button
  elements.btnNewQuote.addEventListener('click', () => {
    if (confirm('Start a new blank quote / invoice? Any saved quotes in History will remain safe.')) {
      resetToNewQuote();
    }
  });

  // Action: Download PDF
  elements.btnDownload.addEventListener('click', () => {
    saveDraftState();
    saveToHistory(state);
    downloadPDF(state, profile);
    incrementQuoteNumber();
    showToast('PDF downloaded & saved to History!');
  });

  // Action: Share / WhatsApp
  elements.btnShare.addEventListener('click', async () => {
    saveDraftState();
    saveToHistory(state);
    const result = await sharePDF(state, profile);
    incrementQuoteNumber();
    if (result && result.method === 'download_and_whatsapp' && result.waUrl) {
      window.open(result.waUrl, '_blank');
      showToast('Downloaded PDF & Opening WhatsApp');
    } else if (result && result.success) {
      showToast('Shared successfully!');
    }
  });

  // Action: Preview PDF
  elements.btnPreview.addEventListener('click', () => {
    saveDraftState();
    const blob = getPDFBlob(state, profile);
    const blobUrl = URL.createObjectURL(blob);
    elements.previewIframe.src = blobUrl;
    elements.modalPreview.classList.remove('hidden');
  });

  elements.btnClosePreview.addEventListener('click', () => {
    elements.modalPreview.classList.add('hidden');
    elements.previewIframe.src = '';
  });

  elements.btnDownloadFromPreview.addEventListener('click', () => {
    elements.btnDownload.click();
    elements.modalPreview.classList.add('hidden');
  });

  elements.btnShareFromPreview.addEventListener('click', () => {
    elements.btnShare.click();
    elements.modalPreview.classList.add('hidden');
  });

  // Profile Modal
  elements.btnOpenProfile.addEventListener('click', () => {
    profile = getProfile();
    elements.profBusinessName.value = profile.businessName || '';
    elements.profTagline.value = profile.tagline || '';
    elements.profPhone.value = profile.phone || '';
    elements.profEmail.value = profile.email || '';
    elements.profAddress.value = profile.address || '';
    elements.profPaymentInfo.value = profile.paymentInfo || '';
    elements.profDefaultTerms.value = profile.defaultTerms || '';
    elements.modalProfile.classList.remove('hidden');
  });

  elements.btnCloseProfile.addEventListener('click', () => {
    elements.modalProfile.classList.add('hidden');
  });

  elements.btnSaveProfile.addEventListener('click', () => {
    profile = {
      businessName: elements.profBusinessName.value.trim() || 'One Man and a Team',
      tagline: elements.profTagline.value.trim(),
      phone: elements.profPhone.value.trim(),
      email: elements.profEmail.value.trim(),
      address: elements.profAddress.value.trim(),
      paymentInfo: elements.profPaymentInfo.value.trim(),
      defaultTerms: elements.profDefaultTerms.value.trim()
    };
    saveProfile(profile);
    applyProfile();
    elements.modalProfile.classList.add('hidden');
    showToast('Business Profile Updated!');
  });

  // History Modal
  elements.btnOpenHistory.addEventListener('click', () => {
    renderHistoryList();
    elements.modalHistory.classList.remove('hidden');
  });

  elements.btnCloseHistory.addEventListener('click', () => {
    elements.modalHistory.classList.add('hidden');
  });

  elements.btnCloseHistoryFooter.addEventListener('click', () => {
    elements.modalHistory.classList.add('hidden');
  });
}

function renderHistoryList() {
  const history = getHistory();
  elements.historyListContainer.innerHTML = '';

  if (history.length === 0) {
    elements.historyListContainer.innerHTML = `
      <div style="text-align: center; color: var(--slate-400); padding: 30px;">
        No saved quotes yet.<br>Quotes are automatically saved here whenever you preview, download, or share!
      </div>
    `;
    return;
  }

  history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <div class="history-item-left">
        <span class="history-name">${escapeHtml(item.customerName || 'Untitled Client')}</span>
        <span class="history-meta">${item.quoteNumber || 'OMT'} • ${item.date || ''} • ${item.type || 'QUOTE'}</span>
      </div>
      <div class="history-item-right">
        <span class="history-total">${formatUSD(item.total || 0)}</span>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="history-btn-load" data-id="${item.id}">Load</button>
          <button type="button" class="item-delete-btn" style="font-size: 16px;" data-del-id="${item.id}">&times;</button>
        </div>
      </div>
    `;

    el.querySelector('.history-btn-load').addEventListener('click', () => {
      state = { ...item };
      syncStateToInputs();
      renderItems();
      elements.modalHistory.classList.add('hidden');
      showToast(`Loaded ${item.quoteNumber}`);
    });

    el.querySelector('[data-del-id]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this saved quote from history?')) {
        deleteFromHistory(item.id);
        renderHistoryList();
      }
    });

    elements.historyListContainer.appendChild(el);
  });
}

// PWA Service Worker Registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered successfully:', reg.scope))
        .catch(err => console.warn('Service Worker registration skipped/failed:', err));
    });
  }
}

// Initial Boot
function init() {
  updateOnlineStatus();
  applyProfile();

  // Try to load last draft, otherwise initialize fresh
  const savedDraft = loadDraft();
  if (savedDraft && savedDraft.items && savedDraft.items.length > 0) {
    state = savedDraft;
  } else {
    state.dueDate = calculateDefaultDueDate(state.date);
    state.notes = profile.defaultTerms;
  }

  syncStateToInputs();
  renderItems();
  initEventListeners();
  registerServiceWorker();
}

init();
