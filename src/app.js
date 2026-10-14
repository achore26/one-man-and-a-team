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
  prefetchLogo,
  getPDFBlob,
  downloadPDF,
  sharePDF
} from './pdf.js';

import { renderIcons } from './icons.js';

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
    { id: 1, description: '4-Channel 5MP IP Surveillance System, NVR & Installation', qty: 1, price: 750 }
  ],
  discount: 0,
  taxPercent: 0,
  depositPercent: 50,
  notes: ''
};

let profile = getProfile();

// DOM Element Registry
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
  itemCountBadge: document.getElementById('itemCountBadge'),
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

// Toast Notification
function showToast(msg) {
  const toastText = elements.toastMessage.querySelector('.toast-text');
  if (toastText) toastText.textContent = msg;
  elements.toastMessage.classList.add('show');
  setTimeout(() => {
    elements.toastMessage.classList.remove('show');
  }, 2400);
}

// Online / Offline Status Chip
function updateOnlineStatus() {
  const icon = elements.statusBadge.querySelector('.status-icon');
  if (navigator.onLine) {
    elements.statusBadge.className = 'status-chip online';
    elements.statusText.textContent = '100% Offline Ready';
    if (icon) icon.setAttribute('data-lucide', 'shield-check');
  } else {
    elements.statusBadge.className = 'status-chip offline';
    elements.statusText.textContent = 'Offline Mode Active';
    if (icon) icon.setAttribute('data-lucide', 'wifi-off');
  }
  renderIcons(elements.statusBadge);
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

// Escape HTML utility
function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Render Line Items
function renderItems() {
  elements.itemsList.innerHTML = '';

  const count = state.items.length;
  elements.itemCountBadge.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;

  if (count === 0) {
    elements.itemsList.innerHTML = `
      <div style="text-align: center; color: var(--md-sys-on-surface-subtle); padding: 24px; font-size: 0.88rem;">
        No line items added. Tap <strong>Add Line Item</strong> or select a preset above.
      </div>
    `;
    updateTotals();
    return;
  }

  state.items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'm3-item-card';

    const lineTotal = (Number(item.qty) || 1) * (Number(item.price) || 0);

    card.innerHTML = `
      <div class="item-row-top">
        <input type="text" class="item-input-desc" value="${escapeHtml(item.description || '')}" placeholder="Description of material, hardware or labor..." data-id="${item.id}" data-field="description">
        <button type="button" class="item-btn-remove" title="Remove Item" data-id="${item.id}" aria-label="Remove Item">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      <div class="item-row-bottom">
        <div>
          <label style="font-size: 0.7rem; margin-bottom: 2px;">Qty</label>
          <input type="number" min="1" step="1" value="${item.qty}" data-id="${item.id}" data-field="qty" class="font-mono">
        </div>
        <div>
          <label style="font-size: 0.7rem; margin-bottom: 2px;">Unit Price ($)</label>
          <div class="m3-input-affix">
            <span class="affix-text">$</span>
            <input type="number" min="0" step="0.5" value="${item.price}" data-id="${item.id}" data-field="price" class="font-mono">
          </div>
        </div>
        <div>
          <label style="font-size: 0.7rem; margin-bottom: 2px; text-align: right; display: block;">Line Total</label>
          <div class="item-computed-total font-mono">${formatUSD(lineTotal)}</div>
        </div>
      </div>
    `;

    elements.itemsList.appendChild(card);
  });

  // Attach Item Input Event Listeners
  elements.itemsList.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', (e) => {
      const id = Number(e.target.dataset.id);
      const field = e.target.dataset.field;
      const val = e.target.value;
      const targetItem = state.items.find(i => i.id === id);
      if (targetItem) {
        if (field === 'qty' || field === 'price') {
          targetItem[field] = Number(val) || 0;
          const card = e.target.closest('.m3-item-card');
          const totalEl = card.querySelector('.item-computed-total');
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

  // Attach Item Delete Listeners
  elements.itemsList.querySelectorAll('.item-btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      state.items = state.items.filter(i => i.id !== id);
      renderItems();
      saveDraftState();
    });
  });

  // Convert Lucide icons in newly injected items
  renderIcons(elements.itemsList);
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
    elements.depositLabel.textContent = `${depositPercent}% Advance Deposit Due:`;
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
  showToast('New blank document initialized');
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
    elements.btnTypeInvoice.setAttribute('aria-selected', 'true');
    elements.btnTypeQuote.classList.remove('active');
    elements.btnTypeQuote.setAttribute('aria-selected', 'false');
    elements.docMetaTitle.textContent = 'Invoice Specifications';
    elements.lblDocNumber.textContent = 'Invoice Reference #';
    elements.lblDocDue.textContent = 'Payment Due Date';
  } else {
    elements.btnTypeQuote.classList.add('active');
    elements.btnTypeQuote.setAttribute('aria-selected', 'true');
    elements.btnTypeInvoice.classList.remove('active');
    elements.btnTypeInvoice.setAttribute('aria-selected', 'false');
    elements.docMetaTitle.textContent = 'Document Specifications';
    elements.lblDocNumber.textContent = 'Reference Number';
    elements.lblDocDue.textContent = 'Terms Expiry / Validity Date';
  }
}

// Update Profile in Header & UI
function applyProfile() {
  elements.headerBusinessName.textContent = (profile.businessName || 'ONE MAN & A TEAM').toUpperCase();
  elements.headerTagline.textContent = profile.tagline || 'Technical & Contracting Services';
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

  // Inputs live change
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
    const lastInput = elements.itemsList.querySelector('.m3-item-card:last-child .item-input-desc');
    if (lastInput) lastInput.focus();
  });

  // Preset Chips
  document.querySelectorAll('.m3-chip').forEach(btn => {
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
      showToast('Item preset added');
    });
  });

  // New Quote Button
  elements.btnNewQuote.addEventListener('click', () => {
    if (confirm('Create a new blank document? Any previously completed documents in History remain safe.')) {
      resetToNewQuote();
    }
  });

  // Action: Download PDF
  elements.btnDownload.addEventListener('click', async () => {
    saveDraftState();
    saveToHistory(state);
    await downloadPDF(state, profile);
    incrementQuoteNumber();
    showToast('PDF generated & downloaded');
  });

  // Action: Share / WhatsApp
  elements.btnShare.addEventListener('click', async () => {
    saveDraftState();
    saveToHistory(state);
    const result = await sharePDF(state, profile);
    incrementQuoteNumber();
    if (result && result.method === 'download_and_whatsapp' && result.waUrl) {
      window.open(result.waUrl, '_blank');
      showToast('Document downloaded & WhatsApp launched');
    } else if (result && result.success) {
      showToast('Document shared successfully');
    }
  });

  // Action: Preview PDF
  elements.btnPreview.addEventListener('click', async () => {
    saveDraftState();
    const blob = await getPDFBlob(state, profile);
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
    showToast('Business profile updated');
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
      <div style="text-align: center; color: var(--md-sys-on-surface-subtle); padding: 36px 16px; font-size: 0.88rem;">
        No documents saved yet.<br>Documents are automatically cataloged here whenever you preview, download, or share.
      </div>
    `;
    return;
  }

  history.forEach(item => {
    const el = document.createElement('div');
    el.className = 'history-entry';
    el.innerHTML = `
      <div class="history-entry-meta">
        <span class="history-customer">${escapeHtml(item.customerName || 'Untitled Client')}</span>
        <span class="history-sub">
          <span>${item.quoteNumber || 'OMT'}</span>
          <span>•</span>
          <span>${item.date || ''}</span>
          <span>•</span>
          <span>${item.type || 'QUOTE'}</span>
        </span>
      </div>
      <div class="history-entry-actions">
        <span class="history-total-amt font-mono">${formatUSD(item.total || 0)}</span>
        <button type="button" class="history-btn-load" data-id="${item.id}">Load</button>
        <button type="button" class="item-btn-remove" data-del-id="${item.id}" title="Delete Record">
          <i data-lucide="trash-2"></i>
        </button>
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
      if (confirm('Delete this record from offline history?')) {
        deleteFromHistory(item.id);
        renderHistoryList();
      }
    });

    elements.historyListContainer.appendChild(el);
  });

  renderIcons(elements.historyListContainer);
}

// PWA Service Worker Registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('OMT Service Worker active:', reg.scope))
        .catch(err => console.warn('Service Worker registration skipped:', err));
    });
  }
}

// Initialize Application
async function init() {
  updateOnlineStatus();
  applyProfile();

  // Prefetch logo asset for instant PDF generation
  prefetchLogo();

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
  renderIcons(); // Initial Lucide render for whole document
  registerServiceWorker();
}

init();
