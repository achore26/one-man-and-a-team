// Storage Manager for One Man and a Team Quote Generator

const STORAGE_KEYS = {
  PROFILE: 'omt_profile_v1',
  CURRENT_QUOTE: 'omt_current_quote_v1',
  HISTORY: 'omt_history_v1',
  NEXT_NUMBER: 'omt_next_number_v1'
};

const DEFAULT_PROFILE = {
  businessName: 'One Man and a Team',
  tagline: 'CCTV • Building & Renovation • Mechanical Services',
  phone: '+1 (555) 019-2834',
  email: 'owen@onemanandteam.com',
  address: 'Mobile Service - On Site & In Field',
  paymentInfo: 'Payment accepted via Cash, Zelle, Bank Transfer.\nZelle / Account: payments@onemanandteam.com',
  defaultTerms: '• Quote valid for 14 days from issue date.\n• 50% deposit required prior to material ordering.\n• Balance due upon job completion and sign-off.\n• Equipment covered by manufacturer warranty.'
};

export function getProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return saved ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) } : DEFAULT_PROFILE;
  } catch (e) {
    console.error('Failed to read profile', e);
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export function getNextQuoteNumber(type = 'QUOTE') {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NEXT_NUMBER);
    let nextNum = raw ? parseInt(raw, 10) : 1001;
    if (isNaN(nextNum)) nextNum = 1001;
    const prefix = type === 'INVOICE' ? 'INV' : 'OMT';
    return `${prefix}-${nextNum}`;
  } catch (e) {
    return `OMT-1001`;
  }
}

export function incrementQuoteNumber() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NEXT_NUMBER);
    let nextNum = raw ? parseInt(raw, 10) : 1001;
    if (isNaN(nextNum)) nextNum = 1001;
    localStorage.setItem(STORAGE_KEYS.NEXT_NUMBER, (nextNum + 1).toString());
  } catch (e) {
    console.error('Failed to increment quote number', e);
  }
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load history', e);
    return [];
  }
}

export function saveToHistory(quote) {
  try {
    const history = getHistory();
    // Check if this quote already exists in history by id
    const existingIndex = history.findIndex(item => item.id === quote.id);
    const itemToSave = {
      ...quote,
      savedAt: new Date().toISOString()
    };
    if (existingIndex >= 0) {
      history[existingIndex] = itemToSave;
    } else {
      history.unshift(itemToSave);
    }
    // Keep last 100 quotes
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save history', e);
  }
}

export function deleteFromHistory(id) {
  try {
    const history = getHistory().filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to delete from history', e);
  }
}

export function saveDraft(quote) {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_QUOTE, JSON.stringify(quote));
  } catch (e) {
    console.error('Failed to save draft', e);
  }
}

export function loadDraft() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_QUOTE);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}
