/**
 * OnHyper Dev - Popup Script
 * Handles API key management UI
 */

import { getKeys, saveKey, deleteKey, getProviderList } from '../lib/storage.js';

// DOM Elements
const providerSelect = document.getElementById('provider-select');
const apiKeyInput = document.getElementById('api-key-input');
const toggleVisibilityBtn = document.getElementById('toggle-visibility');
const addKeyForm = document.getElementById('add-key-form');
const saveBtn = document.getElementById('save-btn');
const statusContainer = document.getElementById('status-container');
const statusMessage = document.getElementById('status-message');
const keysList = document.getElementById('keys-list');

// Provider display names
const PROVIDER_NAMES = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
  scout: 'Scout',
  ollama: 'Ollama'
};

// State
let isLoading = false;

/**
 * Initialize the popup
 */
async function init() {
  await loadSavedKeys();
  setupEventListeners();
}

/**
 * Load and display saved keys
 */
async function loadSavedKeys() {
  try {
    const keys = await getKeys();
    const providers = Object.keys(keys);
    
    if (providers.length === 0) {
      keysList.innerHTML = '<p class="empty-state">No API keys saved yet</p>';
      return;
    }
    
    keysList.innerHTML = providers.map(provider => {
      const keyData = keys[provider];
      const preview = getKeyPreview(keyData);
      const displayName = PROVIDER_NAMES[provider] || provider;
      
      return `
        <div class="key-item" data-provider="${provider}">
          <div class="key-info">
            <span class="key-provider">${displayName}</span>
            <span class="key-preview">${preview}</span>
          </div>
          <div class="key-actions">
            <button class="btn btn-danger delete-btn" data-provider="${provider}">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load keys:', error);
    showStatus('Failed to load saved keys', 'error');
  }
}

/**
 * Get a preview string for a key (last 4 chars)
 * @param {Object} keyData - The encrypted key data
 * @returns {string} Preview string like "sk-...abcd"
 */
function getKeyPreview(keyData) {
  if (keyData && keyData.lastFour) {
    return `••••...${keyData.lastFour}`;
  }
  return '••••••••';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Toggle password visibility
  toggleVisibilityBtn.addEventListener('click', togglePasswordVisibility);
  
  // Form submission
  addKeyForm.addEventListener('submit', handleSaveKey);
  
  // Delete buttons (delegation)
  keysList.addEventListener('click', handleDeleteKey);
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility() {
  const type = apiKeyInput.type === 'password' ? 'text' : 'password';
  apiKeyInput.type = type;
  
  const eyeIcon = toggleVisibilityBtn.querySelector('.eye-icon');
  eyeIcon.textContent = type === 'password' ? '👁' : '👁‍🗨';
}

/**
 * Handle save key form submission
 * @param {Event} e - Form submit event
 */
async function handleSaveKey(e) {
  e.preventDefault();
  
  if (isLoading) return;
  
  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();
  
  if (!provider || !apiKey) {
    showStatus('Please select a provider and enter an API key', 'error');
    return;
  }
  
  setLoading(true);
  
  try {
    // For now, we store the key with a preview of last 4 chars
    // In production, this should encrypt/decrypt
    const keyData = {
      // Note: In production, this would be encrypted data
      // For now, store a reference and last 4 chars for UI
      lastFour: apiKey.slice(-4),
      timestamp: Date.now(),
      // This is where encrypted data would go:
      // salt: ...,
      // iv: ...,
      // ciphertext: ...
      // For development, storing placeholder
      _placeholder: true
    };
    
    await saveKey(provider, keyData);
    
    showStatus(`${PROVIDER_NAMES[provider] || provider} key saved successfully!`, 'success');
    
    // Clear form
    apiKeyInput.value = '';
    providerSelect.value = '';
    
    // Reload keys list
    await loadSavedKeys();
  } catch (error) {
    console.error('Failed to save key:', error);
    showStatus('Failed to save key. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Handle delete key button click
 * @param {Event} e - Click event
 */
async function handleDeleteKey(e) {
  if (!e.target.classList.contains('delete-btn')) return;
  
  const provider = e.target.dataset.provider;
  const displayName = PROVIDER_NAMES[provider] || provider;
  
  if (!confirm(`Delete ${displayName} API key?`)) {
    return;
  }
  
  try {
    await deleteKey(provider);
    showStatus(`${displayName} key deleted`, 'success');
    await loadSavedKeys();
  } catch (error) {
    console.error('Failed to delete key:', error);
    showStatus('Failed to delete key. Please try again.', 'error');
  }
}

/**
 * Show status message
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
function showStatus(message, type = 'success') {
  statusContainer.className = `status-container ${type}`;
  statusMessage.textContent = message;
  statusContainer.hidden = false;
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusContainer.hidden = true;
  }, 3000);
}

/**
 * Set loading state
 * @param {boolean} loading - Loading state
 */
function setLoading(loading) {
  isLoading = loading;
  saveBtn.disabled = loading;
  providerSelect.disabled = loading;
  apiKeyInput.disabled = loading;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);