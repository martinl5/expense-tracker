/**
 * Configuration for Expense Tracker
 * Stores all configuration in ScriptProperties
 */

const CONFIG = {
  // ScriptProperties keys
  KEYS: {
    OPENROUTER_API_KEY: 'OPENROUTER_API_KEY',
    SPREADSHEET_NAME: 'SPREADSHEET_NAME',
    LAST_RUN_DATE: 'LAST_RUN_DATE',
    MODEL: 'MODEL'
  },
  
  // Default values
  DEFAULTS: {
    SPREADSHEET_NAME: 'Expense Tracker',
    MODEL: 'openrouter/free,
    LAST_RUN_DATE: null // Will be set on first run
  },

  // Sheet column headers
  SHEET_HEADERS: ['Date', 'Currency', 'Amount', 'Merchant', 'Category', 'Type', 'Bank', 'Raw Description'],
  
  // Bank identifiers for parsing
  BANKS: {
    OCBC: { name: 'OCBC', pattern: /ocbc\.com|notify\.ocbc\.com/i },
    DBS: { name: 'DBS', pattern: /dbs\.com|ibanking\.alert@dbs\.com/i },
    UOB: { name: 'UOB', pattern: /uobgroup\.com|unialerts@uobgroup\.com/i },
    TRUST: { name: 'Trust', pattern: /trustbank\.sg|from_us@trustbank\.sg/i },
    GXS: { name: 'GXS', pattern: /gxs\.com\.sg|no-reply@gxs\.com\.sg/i },
    PAYLAH: { name: 'PayLah', pattern: /paylah\.alert@dbs\.com/i }
  }
};

/**
 * Initialize configuration
 * Run this once to set up ScriptProperties
 * 
 * IMPORTANT: Set your OpenRouter API key here or via ScriptProperties UI
 */
function initializeConfig() {
  const props = PropertiesService.getScriptProperties();
  
  // IMPORTANT: Replace with your own OpenRouter API key
  // Get your free key at: https://openrouter.ai/
  // const apiKey = 'YOUR_OPENROUTER_API_KEY_HERE';
  // props.setProperty(CONFIG.KEYS.OPENROUTER_API_KEY, apiKey);
  
  // For now, prompt user to set the API key
  const existingKey = props.getProperty(CONFIG.KEYS.OPENROUTER_API_KEY);
  if (!existingKey) {
    Logger.log('WARNING: OpenRouter API key not set!');
    Logger.log('Please run: setOpenRouterApiKey("your-api-key")');
  }
  
  // Set default values
  props.setProperty(CONFIG.KEYS.SPREADSHEET_NAME, CONFIG.DEFAULTS.SPREADSHEET_NAME);
  props.setProperty(CONFIG.KEYS.MODEL, CONFIG.DEFAULTS.MODEL);
  
  // Initialize last run date to now (only new emails after this will be processed)
  props.setProperty(CONFIG.KEYS.LAST_RUN_DATE, new Date().toISOString());
  
  Logger.log('Configuration initialized!');
  return 'Configuration set up complete!';
}

/**
 * Set OpenRouter API key
 * Run this with your API key: setOpenRouterApiKey("sk-or-v1-...")
 */
function setOpenRouterApiKey(apiKey) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.KEYS.OPENROUTER_API_KEY, apiKey);
  Logger.log('OpenRouter API key saved!');
  return 'API key set!';
}

/**
 * Get configuration value
 */
function getConfig(key) {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty(key);
}

/**
 * Update last run date
 */
function updateLastRunDate() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CONFIG.KEYS.LAST_RUN_DATE, new Date().toISOString());
}

/**
 * Get last run date
 */
function getLastRunDate() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty(CONFIG.KEYS.LAST_RUN_DATE);
}
