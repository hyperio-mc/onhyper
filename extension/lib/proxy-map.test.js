/**
 * Tests for proxy-map.js and providers.js
 * Run with: node --experimental-vm-modules proxy-map.test.js
 */

import {
  PROXY_MAP,
  matchProxyUrl,
  buildRealUrl,
  getAuthHeaders,
  isLocalhost,
  getProviders,
  isProviderSupported
} from './proxy-map.js';

import {
  PROVIDERS,
  getProvider,
  getAllProviders,
  validateApiKey,
  maskApiKey,
  findProviders
} from './providers.js';

// Simple test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
  }
}

function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(`${message}\n  Expected truthy, got: ${value}`);
  }
}

function assertFalse(value, message = '') {
  if (value) {
    throw new Error(`${message}\n  Expected falsy, got: ${value}`);
  }
}

function assertNull(value, message = '') {
  if (value !== null) {
    throw new Error(`${message}\n  Expected null, got: ${JSON.stringify(value)}`);
  }
}

console.log('\n=== URL Matching Tests ===\n');

test('matchProxyUrl matches OpenAI proxy path', () => {
  const result = matchProxyUrl('/proxy/openai/v1/chat/completions');
  assertDeepEqual(result, { provider: 'openai', path: 'v1/chat/completions' });
});

test('matchProxyUrl matches Anthropic proxy path', () => {
  const result = matchProxyUrl('/proxy/anthropic/v1/messages');
  assertDeepEqual(result, { provider: 'anthropic', path: 'v1/messages' });
});

test('matchProxyUrl matches OpenRouter proxy path', () => {
  const result = matchProxyUrl('/proxy/openrouter/chat/completions');
  assertDeepEqual(result, { provider: 'openrouter', path: 'chat/completions' });
});

test('matchProxyUrl matches Scout proxy path', () => {
  const result = matchProxyUrl('/proxy/scout-atoms/run');
  assertDeepEqual(result, { provider: 'scout', path: 'run' });
});

test('matchProxyUrl matches Ollama proxy path', () => {
  const result = matchProxyUrl('/proxy/ollama/api/generate');
  assertDeepEqual(result, { provider: 'ollama', path: 'api/generate' });
});

test('matchProxyUrl returns null for non-proxy URL', () => {
  const result = matchProxyUrl('/api/chat');
  assertNull(result);
});

test('matchProxyUrl handles full URLs', () => {
  const result = matchProxyUrl('http://localhost:3000/proxy/openai/v1/models');
  assertDeepEqual(result, { provider: 'openai', path: 'v1/models' });
});

test('matchProxyUrl handles chrome-extension URLs', () => {
  const result = matchProxyUrl('chrome-extension://abc123/proxy/anthropic/v1/messages');
  assertDeepEqual(result, { provider: 'anthropic', path: 'v1/messages' });
});

console.log('\n=== URL Building Tests ===\n');

test('buildRealUrl builds OpenAI URL', () => {
  const url = buildRealUrl('openai', 'v1/chat/completions');
  assertEqual(url, 'https://api.openai.com/v1/chat/completions');
});

test('buildRealUrl builds Anthropic URL', () => {
  const url = buildRealUrl('anthropic', 'v1/messages');
  assertEqual(url, 'https://api.anthropic.com/v1/messages');
});

test('buildRealUrl builds OpenRouter URL', () => {
  const url = buildRealUrl('openrouter', 'chat/completions');
  assertEqual(url, 'https://openrouter.ai/api/v1/chat/completions');
});

test('buildRealUrl builds Scout URL', () => {
  const url = buildRealUrl('scout', 'run');
  assertEqual(url, 'https://atoms.api.scoutos.com/run');
});

test('buildRealUrl builds Ollama URL pointing to localhost', () => {
  const url = buildRealUrl('ollama', 'api/generate');
  assertEqual(url, 'http://localhost:11434/api/generate');
});

test('buildRealUrl preserves query params', () => {
  const url = buildRealUrl('openai', 'v1/models', '?limit=10');
  assertEqual(url, 'https://api.openai.com/v1/models?limit=10');
});

test('buildRealUrl handles query string without leading ?', () => {
  const url = buildRealUrl('openai', 'v1/models', 'limit=10&offset=5');
  assertEqual(url, 'https://api.openai.com/v1/models?limit=10&offset=5');
});

test('buildRealUrl throws for unknown provider', () => {
  try {
    buildRealUrl('unknown', 'test');
    throw new Error('Should have thrown');
  } catch (e) {
    assertTrue(e.message.includes('Unknown provider'));
  }
});

console.log('\n=== Auth Header Tests ===\n');

test('getAuthHeaders generates OpenAI headers', () => {
  const headers = getAuthHeaders('openai', 'sk-test-key-123');
  assertDeepEqual(headers, { 'Authorization': 'Bearer sk-test-key-123' });
});

test('getAuthHeaders generates Anthropic headers with version', () => {
  const headers = getAuthHeaders('anthropic', 'sk-ant-api03-test');
  assertDeepEqual(headers, { 
    'x-api-key': 'sk-ant-api03-test',
    'anthropic-version': '2023-06-01'
  });
});

test('getAuthHeaders generates OpenRouter headers with Referer and Title', () => {
  const headers = getAuthHeaders('openrouter', 'sk-or-test-key');
  assertDeepEqual(headers, { 
    'Authorization': 'Bearer sk-or-test-key',
    'HTTP-Referer': 'https://onhyper.io',
    'X-Title': 'OnHyper Dev'
  });
});

test('getAuthHeaders generates Scout headers', () => {
  const headers = getAuthHeaders('scout', 'secret_test_key');
  assertDeepEqual(headers, { 'Authorization': 'Bearer secret_test_key' });
});

test('getAuthHeaders generates empty headers for Ollama (local, no auth)', () => {
  const headers = getAuthHeaders('ollama', 'ignored-key');
  assertDeepEqual(headers, {});
});

test('getAuthHeaders throws for unknown provider', () => {
  try {
    getAuthHeaders('unknown', 'key');
    throw new Error('Should have thrown');
  } catch (e) {
    assertTrue(e.message.includes('Unknown provider'));
  }
});

console.log('\n=== Header Security Tests ===\n');

test('Auth headers are plain objects (not prototypes)', () => {
  const headers = getAuthHeaders('openai', 'sk-test');
  assertTrue(headers.constructor === Object);
  assertTrue(headers.__proto__ === Object.prototype);
});

test('Auth headers do not contain prototype pollution keys as own properties', () => {
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  for (const provider of getProviders()) {
    const headers = getAuthHeaders(provider, 'test-key');
    for (const key of dangerousKeys) {
      assertFalse(Object.prototype.hasOwnProperty.call(headers, key), 
        `Provider ${provider} headers should not have own property ${key}`);
    }
  }
});

test('Auth headers keys have no leading/trailing whitespace', () => {
  for (const provider of getProviders()) {
    const headers = getAuthHeaders(provider, 'test-key');
    for (const key of Object.keys(headers)) {
      assertEqual(key, key.trim(), `Key "${key}" for ${provider} has whitespace`);
    }
  }
});

test('Auth header values are strings', () => {
  for (const provider of getProviders()) {
    const headers = getAuthHeaders(provider, 'test-key');
    for (const value of Object.values(headers)) {
      assertEqual(typeof value, 'string', `Value for ${provider} should be string`);
    }
  }
});

console.log('\n=== Localhost Detection Tests ===\n');

test('isLocalhost detects localhost', () => {
  assertTrue(isLocalhost('http://localhost:3000/api'));
});

test('isLocalhost detects 127.0.0.1', () => {
  assertTrue(isLocalhost('http://127.0.0.1:3000/api'));
});

test('isLocalhost detects file:// protocol', () => {
  assertTrue(isLocalhost('file:///Users/test/index.html'));
});

test('isLocalhost detects ::1 IPv6 localhost', () => {
  assertTrue(isLocalhost('http://[::1]:3000/api'));
});

test('isLocalhost detects .localhost domain', () => {
  assertTrue(isLocalhost('http://app.localhost:3000/api'));
});

test('isLocalhost detects .local domain', () => {
  assertTrue(isLocalhost('http://myserver.local/api'));
});

test('isLocalhost detects 192.168.x.x private IP', () => {
  assertTrue(isLocalhost('http://192.168.1.100/api'));
});

test('isLocalhost detects 10.x.x.x private IP', () => {
  assertTrue(isLocalhost('http://10.0.0.1/api'));
});

test('isLocalhost returns false for public URLs', () => {
  assertFalse(isLocalhost('https://api.openai.com/v1/chat'));
});

test('isLocalhost handles invalid URLs gracefully', () => {
  assertFalse(isLocalhost('not-a-url'));
});

test('isLocalhost detects Ollama localhost URL', () => {
  assertTrue(isLocalhost('http://localhost:11434/api/generate'));
});

console.log('\n=== Provider Utility Tests ===\n');

test('getProviders returns all provider IDs including Ollama', () => {
  const providers = getProviders();
  assertTrue(providers.includes('openai'));
  assertTrue(providers.includes('anthropic'));
  assertTrue(providers.includes('openrouter'));
  assertTrue(providers.includes('scout'));
  assertTrue(providers.includes('ollama'));
  assertEqual(providers.length, 5);
});

test('isProviderSupported returns true for known providers', () => {
  assertTrue(isProviderSupported('openai'));
  assertTrue(isProviderSupported('anthropic'));
  assertTrue(isProviderSupported('ollama'));
});

test('isProviderSupported returns false for unknown providers', () => {
  assertFalse(isProviderSupported('unknown'));
  assertFalse(isProviderSupported('google'));
});

console.log('\n=== Provider Metadata Tests ===\n');

test('getProvider returns correct metadata', () => {
  const openai = getProvider('openai');
  assertEqual(openai.id, 'openai');
  assertEqual(openai.name, 'OpenAI');
  assertEqual(openai.keyPrefix, 'sk-');
  assertTrue(openai.keyFormat instanceof RegExp);
});

test('getProvider returns correct metadata for Ollama', () => {
  const ollama = getProvider('ollama');
  assertEqual(ollama.id, 'ollama');
  assertEqual(ollama.name, 'Ollama');
  assertEqual(ollama.keyPrefix, '');
  assertNull(ollama.keyFormat);
});

test('getProvider returns null for unknown provider', () => {
  assertNull(getProvider('unknown'));
});

test('getAllProviders returns array of all providers', () => {
  const all = getAllProviders();
  assertEqual(all.length, 5);
  assertTrue(all.every(p => p.id && p.name));
});

console.log('\n=== API Key Validation Tests ===\n');

test('validateApiKey accepts valid OpenAI key format', () => {
  const result = validateApiKey('openai', 'sk-abcdefghij1234567890abcdefghijklmnopqrstuvwxyz');
  assertTrue(result.valid);
});

test('validateApiKey rejects OpenAI key without sk- prefix', () => {
  const result = validateApiKey('openai', 'invalid-key');
  assertFalse(result.valid);
  assertTrue(result.error.includes('Expected prefix: sk-'));
});

test('validateApiKey accepts valid Anthropic key format', () => {
  const result = validateApiKey('anthropic', 'sk-ant-api03-' + 'a'.repeat(80));
  assertTrue(result.valid);
});

test('validateApiKey rejects Anthropic key without sk-ant- prefix', () => {
  const result = validateApiKey('anthropic', 'sk-invalid-key');
  assertFalse(result.valid);
});

test('validateApiKey accepts valid OpenRouter key format', () => {
  const result = validateApiKey('openrouter', 'sk-or-abcdefghij1234567890abcdefghijklmnop');
  assertTrue(result.valid);
});

test('validateApiKey accepts valid Scout key format', () => {
  const result = validateApiKey('scout', 'secret_abcdefghij1234567890abcdefghijklmnop');
  assertTrue(result.valid);
});

test('validateApiKey accepts Ollama without any key (local, no auth)', () => {
  const result = validateApiKey('ollama', null);
  assertTrue(result.valid);
});

test('validateApiKey accepts Ollama with empty key', () => {
  const result = validateApiKey('ollama', '');
  assertTrue(result.valid);
});

test('validateApiKey accepts Ollama with any value (ignored)', () => {
  const result = validateApiKey('ollama', 'ignored');
  assertTrue(result.valid);
});

test('validateApiKey rejects empty key for non-Ollama providers', () => {
  const result = validateApiKey('openai', '');
  assertFalse(result.valid);
  assertTrue(result.error.includes('required'));
});

test('validateApiKey rejects null key for non-Ollama providers', () => {
  const result = validateApiKey('openai', null);
  assertFalse(result.valid);
});

test('validateApiKey rejects unknown provider', () => {
  const result = validateApiKey('unknown', 'some-key');
  assertFalse(result.valid);
  assertTrue(result.error.includes('Unknown provider'));
});

console.log('\n=== API Key Masking Tests ===\n');

test('maskApiKey masks OpenAI key correctly', () => {
  const masked = maskApiKey('openai', 'sk-test123456789abcdefghijklmnop');
  assertTrue(masked.startsWith('sk-'));
  assertTrue(masked.includes('•'));
  assertTrue(masked.endsWith('mnop'));
});

test('maskApiKey masks Anthropic key correctly', () => {
  const masked = maskApiKey('anthropic', 'sk-ant-api03-' + 'a'.repeat(80));
  assertTrue(masked.startsWith('sk-ant-'));
  assertTrue(masked.includes('•'));
});

test('maskApiKey handles short keys', () => {
  const masked = maskApiKey('openai', 'short');
  assertEqual(masked, '***');
});

test('maskApiKey handles null key', () => {
  const masked = maskApiKey('openai', null);
  assertEqual(masked, '***');
});

test('maskApiKey handles Ollama (no key needed)', () => {
  const masked = maskApiKey('ollama', null);
  assertEqual(masked, '***');
});

console.log('\n=== Provider Search Tests ===\n');

test('findProviders finds by partial ID', () => {
  const results = findProviders('open');
  assertTrue(results.includes('openai'));
  assertTrue(results.includes('openrouter'));
});

test('findProviders finds by partial name', () => {
  const results = findProviders('anth');
  assertTrue(results.includes('anthropic'));
  assertEqual(results.length, 1);
});

test('findProviders finds Ollama', () => {
  const results = findProviders('oll');
  assertTrue(results.includes('ollama'));
});

test('findProviders is case-insensitive', () => {
  const results = findProviders('OPEN');
  assertTrue(results.includes('openai'));
  assertTrue(results.includes('openrouter'));
});

test('findProviders returns empty array for no match', () => {
  const results = findProviders('nonexistent');
  assertEqual(results.length, 0);
});

console.log('\n=== Integration Tests ===\n');

test('Full proxy flow: match, build, and auth for OpenAI', () => {
  const url = '/proxy/openai/v1/chat/completions?model=gpt-4';
  const match = matchProxyUrl(url);
  assertTrue(match !== null);
  assertEqual(match.provider, 'openai');
  
  const realUrl = buildRealUrl(match.provider, match.path, '?model=gpt-4');
  assertTrue(realUrl.startsWith('https://api.openai.com/'));
  
  const headers = getAuthHeaders(match.provider, 'sk-test-key');
  assertTrue('Authorization' in headers);
});

test('Full proxy flow: match, build, and auth for Anthropic', () => {
  const url = '/proxy/anthropic/v1/messages';
  const match = matchProxyUrl(url);
  assertTrue(match !== null);
  assertEqual(match.provider, 'anthropic');
  
  const realUrl = buildRealUrl(match.provider, match.path);
  assertEqual(realUrl, 'https://api.anthropic.com/v1/messages');
  
  const headers = getAuthHeaders(match.provider, 'sk-ant-test');
  assertTrue('x-api-key' in headers);
  assertTrue('anthropic-version' in headers);
});

test('Full proxy flow: match, build, and auth for OpenRouter with all headers', () => {
  const url = '/proxy/openrouter/chat/completions';
  const match = matchProxyUrl(url);
  assertTrue(match !== null);
  assertEqual(match.provider, 'openrouter');
  
  const realUrl = buildRealUrl(match.provider, match.path);
  assertEqual(realUrl, 'https://openrouter.ai/api/v1/chat/completions');
  
  const headers = getAuthHeaders(match.provider, 'sk-or-test');
  assertTrue('Authorization' in headers);
  assertTrue('HTTP-Referer' in headers);
  assertTrue('X-Title' in headers);
  assertEqual(headers['HTTP-Referer'], 'https://onhyper.io');
  assertEqual(headers['X-Title'], 'OnHyper Dev');
});

test('Full proxy flow: match, build, and auth for Ollama (local)', () => {
  const url = '/proxy/ollama/api/generate';
  const match = matchProxyUrl(url);
  assertTrue(match !== null);
  assertEqual(match.provider, 'ollama');
  
  const realUrl = buildRealUrl(match.provider, match.path);
  assertEqual(realUrl, 'http://localhost:11434/api/generate');
  assertTrue(isLocalhost(realUrl));
  
  const headers = getAuthHeaders(match.provider, 'ignored');
  assertEqual(Object.keys(headers).length, 0);
});

console.log('\n=== Header Provider-Specific Format Tests ===\n');

test('OpenAI header format is correct', () => {
  const headers = getAuthHeaders('openai', 'sk-secret123');
  assertEqual(Object.keys(headers).length, 1);
  assertTrue(headers['Authorization'].startsWith('Bearer '));
  assertTrue(headers['Authorization'].endsWith('sk-secret123'));
});

test('Anthropic header format includes both required headers', () => {
  const headers = getAuthHeaders('anthropic', 'sk-ant-key');
  assertEqual(Object.keys(headers).length, 2);
  assertEqual(headers['x-api-key'], 'sk-ant-key');
  assertEqual(headers['anthropic-version'], '2023-06-01');
});

test('OpenRouter header format includes authorization and attribution headers', () => {
  const headers = getAuthHeaders('openrouter', 'sk-or-key');
  assertEqual(Object.keys(headers).length, 3);
  assertEqual(headers['Authorization'], 'Bearer sk-or-key');
  assertEqual(headers['HTTP-Referer'], 'https://onhyper.io');
  assertEqual(headers['X-Title'], 'OnHyper Dev');
});

test('Scout header format is correct', () => {
  const headers = getAuthHeaders('scout', 'secret_key123');
  assertEqual(Object.keys(headers).length, 1);
  assertEqual(headers['Authorization'], 'Bearer secret_key123');
});

test('Ollama header format is empty (no auth needed)', () => {
  const headers = getAuthHeaders('ollama', 'anything');
  assertEqual(Object.keys(headers).length, 0);
  assertDeepEqual(headers, {});
});

// Summary
console.log('\n' + '='.repeat(40));
console.log(`Tests completed: ${passed} passed, ${failed} failed`);
console.log('='.repeat(40) + '\n');

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);