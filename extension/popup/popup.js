/**
 * @fileoverview Popup UI script for the OnHyper Dev browser extension.
 * 
 * This module handles the extension popup interface for:
 * - Displaying configured API providers and keys
 * - Adding new provider/key combinations
 * - Deleting existing keys
 * - Managing key visibility toggle
 * 
 * The popup communicates with the service worker via chrome.runtime.sendMessage
 * to set passwords and manage keys.
 * 
 * @module popup/popup
 * @requires lib/storage
 * 
 * @example
 * // Popup is auto-initialized on DOMContentLoaded
 * // Users interact via the form interface
 */

import { getKeys, saveKey, deleteKey, getProviderList } from '../lib/storage.js';

// ============================================
// DOM Element References
// ============================================

/**
 * Provider selection dropdown element.
 * @type {HTMLSelectElement}
 */
const providerSelect = document.getElementById('provider-select');

/**
 * API key input field (password type by default).
 * @type {HTMLInputElement}
 */
const apiKeyInput = document.getElementById('api-key-input');

/**
 * Toggle button for API key visibility.
 * @type {HTMLButtonElement}
 */
const toggleVisibilityBtn = document.getElementById('toggle-visibility');

/**
 * Form element for adding new keys.
 * @type {HTMLFormElement}
 */
const addKeyForm = document.getElementById('add-key-form');

/**
 * Submit button for the add key form.
 * @type {HTMLButtonElement}
 */
const saveBtn = document.getElementById('save-btn');

/**
 * Container for status messages (success/error).
 * @type {HTMLElement}
 */
const statusContainer = document.getElementById('status-container');

/**
 * Text element for status message content.
 * @type {HTMLElement}
 */
const statusMessage = document.getElementById('status-message');

/**
 * Container for the list of saved keys.
 * @type {HTMLElement}
 */
const keysList = document.getElementById('keys-list');

// ============================================
// Configuration
// ============================================

/**
 * Human-readable display names for providers.
 * @constant {Object.<string, string>}
 */
const PROVIDER_NAMES = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
  scout: 'Scout',
  ollama: 'Ollama'
};

// ============================================
// State
// ============================================

/**
 * Loading state flag to prevent duplicate submissions.
 * @type {boolean}
 */
let isLoading = false;

// ============================================
// Initialization
// ============================================

/**
 * Initializes the popup on load.
 * 
 * - Loads and displays saved keys
 * - Sets up event listeners
 * 
 * @async
 * @returns {Promise<void>}
 */
async function init() {
  await loadSavedKeys();
  setupEventListeners();
}

// ============================================
// Key Management
// ============================================

/**
 * Loads saved API keys from storage and renders the key list.
 * 
 * Retrieves all keys and displays each provider with masked key preview.
 * Shows empty state message if no keys are saved.
 * 
 * @async
 * @returns {Promise<void>}
 * 
 * @example
 * // Called on popup init
 * await loadSavedKeys();
 * // Renders: <div class="key-item">OpenAI: ••••...xxxx</div>
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
 * Generates a preview string for a stored key.
 * 
 * Shows masked dots with last 4 characters if available.
 * Used for safe display in the key list UI.
 * 
 * @param {Object} keyData - The stored key data object
 * @param {string} [keyData.lastFour] - Last 4 characters of the key (optional)
 * @returns {string} Preview string like "••••...abcd" or "••••••••"
 * 
 * @example
 * getKeyPreview({ lastFour: 'abcd' });  // '••••...abcd'
 * getKeyPreview({});                     // '••••••••'
 */
function getKeyPreview(keyData) {
  if (keyData && keyData.lastFour) {
    return `••••...${keyData.lastFour}`;
  }
  return '••••••••';
}

// ============================================
// Event Handling
// ============================================

/**
 * Sets up all event listeners for the popup.
 * 
 * - Toggle password visibility button
 * - Form submission for adding keys
 * - Delete button clicks (event delegation)
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
 * Toggles the API key input between password (hidden) and text (visible).
 * 
 * Updates the eye icon to reflect current visibility state.
 * 
 * @returns {void}
 * 
 * @example
 * // Initially: input type="password", icon shows 👁
 * togglePasswordVisibility();
 * // Now: input type="text", icon shows 👁‍🗨
 */
function togglePasswordVisibility() {
  const type = apiKeyInput.type === 'password' ? 'text' : 'password';
  apiKeyInput.type = type;
  
  const eyeIcon = toggleVisibilityBtn.querySelector('.eye-icon');
  eyeIcon.textContent = type === 'password' ? '👁' : '👁‍🗨';
}

/**
 * Handles the add key form submission.
 * 
 * Validates input, saves the key to storage, and refreshes the key list.
 * The key is stored with metadata including last 4 characters for preview.
 * 
 * @async
 * @param {Event} e - Form submit event
 * @returns {Promise<void>}
 * 
 * @example
 * // Triggered by form submit
 * // User selects 'openai', enters 'sk-xxxx'
 * // Result: Key saved, form cleared, list refreshed
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
 * Handles delete button clicks for removing stored keys.
 * 
 * Confirms deletion with user, removes key from storage, and refreshes list.
 * Uses event delegation - listens on parent container.
 * 
 * @async
 * @param {Event} e - Click event from keys list
 * @returns {Promise<void>}
 * 
 * @example
 * // User clicks delete button on 'openai' key item
 * // Confirm dialog appears
 * // On confirm: key deleted, success message shown, list refreshed
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

// ============================================
// UI Utilities
// ============================================

/**
 * Displays a status message in the popup.
 * 
 * Shows success (green) or error (red) message with auto-hide.
 * Message auto-hides after 3 seconds.
 * 
 * @param {string} message - Message text to display
 * @param {string} [type='success'] - Message type: 'success' or 'error'
 * @returns {void}
 * 
 * @example
 * showStatus('Key saved!', 'success');
 * // Shows green message, auto-hides after 3s
 * 
 * showStatus('Failed to save', 'error');
 * // Shows red message, auto-hides after 3s
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
 * Sets the loading state for the popup UI.
 * 
 * Disables/enables form controls during async operations.
 * 
 * @param {boolean} loading - Whether to show loading state
 * @returns {void}
 * 
 * @example
 * setLoading(true);   // Disables form controls
 * setLoading(false);  // Enables form controls
 */
function setLoading(loading) {
  isLoading = loading;
  saveBtn.disabled = loading;
  providerSelect.disabled = loading;
  apiKeyInput.disabled = loading;
}

// ============================================
// Startup
// ============================================

/**
 * Initialize popup when DOM is ready.
 * 
 * @listens DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', init);