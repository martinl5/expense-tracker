/**
 * Expense Tracker - Main Orchestrator
 * Processes bank transaction emails and logs to Google Sheets
 */

/**
 * Main entry point - Run this to process new expenses
 * Can be triggered manually or by time-based trigger
 */
function runExpenseTracker() {
  Logger.log('=== Expense Tracker Started ===');
  Logger.log('Start time: ' + new Date().toISOString());
  
  try {
    // Step 1: Get new bank emails
    Logger.log('Step 1: Fetching new bank emails...');
    const emails = getNewBankEmails();
    Logger.log('Found ' + emails.length + ' new emails');
    
    if (emails.length === 0) {
      Logger.log('No new emails to process');
      updateLastRunDate();
      return 'No new expenses found';
    }
    
    // Step 2: Parse emails
    Logger.log('Step 2: Parsing emails...');
    const parsedExpenses = [];
    
    for (const email of emails) {
      const parsed = parseEmail(email);
      if (parsed) {
        parsed.bank = email.bank;
        parsed.messageId = email.messageId;
        parsedExpenses.push(parsed);
        Logger.log('Parsed: ' + parsed.bank + ' - ' + parsed.merchant + ' - ' + parsed.amount);
      } else {
        Logger.log('Failed to parse email from: ' + email.from);
      }
    }
    
    Logger.log('Successfully parsed ' + parsedExpenses.length + ' expenses');
    
    if (parsedExpenses.length === 0) {
      updateLastRunDate();
      return 'No parseable expenses found';
    }
    
    // Step 3: Categorize expenses using OpenRouter
    Logger.log('Step 3: Categorizing expenses...');
    const categorizedExpenses = batchCategorize(parsedExpenses);
    
    Logger.log('Categorization complete');
    
    // Step 4: Write to Google Sheets
    Logger.log('Step 4: Writing to Google Sheets...');
    const written = writeExpensesToSheet(categorizedExpenses);
    
    Logger.log('Wrote ' + written + ' expenses to sheet');
    
    // Step 5: Update last run date
    updateLastRunDate();
    Logger.log('Last run date updated');
    
    Logger.log('=== Expense Tracker Completed ===');
    Logger.log('Total emails: ' + emails.length);
    Logger.log('Parsed: ' + parsedExpenses.length);
    Logger.log('Written: ' + written);
    
    return {
      emailsFound: emails.length,
      parsed: parsedExpenses.length,
      written: written,
      timestamp: new Date().toISOString()
    };
    
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    return 'Error: ' + e.message;
  }
}

/**
 * Manual run with verbose logging
 */
function runExpenseTrackerVerbose() {
  Logger.log('=== Verbose Expense Tracker ===');
  
  // Log config
  const lastRun = getLastRunDate();
  Logger.log('Last run date: ' + lastRun);
  Logger.log('Spreadsheet name: ' + getConfig(CONFIG.KEYS.SPREADSHEET_NAME));
  
  // Run main
  const result = runExpenseTracker();
  
  // Log results
  Logger.log('=== Results ===');
  Logger.log(JSON.stringify(result));
  
  // Get spreadsheet URL
  const ssUrl = getSpreadsheetUrl();
  Logger.log('Spreadsheet: ' + ssUrl);
  
  return result;
}

/**
 * First-time setup
 * Run this once to initialize everything
 */
function firstTimeSetup() {
  Logger.log('=== First Time Setup ===');
  
  // 1. Initialize configuration
  Logger.log('1. Initializing configuration...');
  initializeConfig();
  Logger.log('Configuration initialized');
  
  // 2. Test Gmail access
  Logger.log('2. Testing Gmail access...');
  const testEmails = testGetEmails();
  Logger.log('Gmail test: found ' + testEmails.length + ' emails (last 7 days)');
  
  // 3. Create test sheet
  Logger.log('3. Creating/accessing spreadsheet...');
  const ssUrl = getSpreadsheetUrl();
  Logger.log('Spreadsheet: ' + ssUrl);
  
  // 4. Setup trigger
  Logger.log('4. Setting up daily trigger...');
  createDailyTrigger();
  
  Logger.log('=== Setup Complete ===');
  Logger.log('Spreadsheet URL: ' + ssUrl);
  Logger.log('Daily trigger activated');
  
  return {
    spreadsheetUrl: ssUrl,
    status: 'Setup complete!'
  };
}

/**
 * Reset everything
 * Run to reset config and triggers
 */
function resetExpenseTracker() {
  Logger.log('Resetting Expense Tracker...');
  
  // Remove triggers
  removeTrigger();
  
  // Reset config
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(CONFIG.KEYS.LAST_RUN_DATE);
  
  Logger.log('Reset complete. Run firstTimeSetup() to reinitialize.');
  return 'Reset complete';
}

/**
 * Debug: View all script properties
 */
function viewProperties() {
  const props = PropertiesService.getScriptProperties();
  const keys = props.getKeys();
  
  const output = {};
  for (const key of keys) {
    // Don't show full API key
    if (key.includes('API_KEY')) {
      output[key] = '***HIDDEN***';
    } else {
      output[key] = props.getProperty(key);
    }
  }
  
  return output;
}
