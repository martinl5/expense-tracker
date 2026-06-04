/**
 * Google Sheets Service - Read/Write expense data
 */

/**
 * Get or create the expense tracker spreadsheet
 */
function getOrCreateSpreadsheet() {
  const spreadsheetName = getConfig(CONFIG.KEYS.SPREADSHEET_NAME) || CONFIG.DEFAULTS.SPREADSHEET_NAME;
  
  // Try to find existing spreadsheet using DriveApp
  const files = DriveApp.getFilesByName(spreadsheetName);
  let spreadsheet = null;
  
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === 'application/vnd.google-apps.spreadsheet') {
      spreadsheet = SpreadsheetApp.openById(file.getId());
      break;
    }
  }
  
  if (spreadsheet) {
    Logger.log('Found existing spreadsheet: ' + spreadsheetName);
    return spreadsheet;
  }
  
  // Create new spreadsheet
  Logger.log('Creating new spreadsheet: ' + spreadsheetName);
  spreadsheet = SpreadsheetApp.create(spreadsheetName);
  
  // Add headers
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName('Expenses');
  sheet.getRange(1, 1, 1, CONFIG.SHEET_HEADERS.length).setValues([CONFIG.SHEET_HEADERS]);
  sheet.getRange(1, 1, 1, CONFIG.SHEET_HEADERS.length).setFontWeight('bold');
  
  // Format header row
  sheet.setFrozenRows(1);
  
  return spreadsheet;
}

/**
 * Get spreadsheet by ID (if user has existing ID)
 */
function getSpreadsheetById(spreadsheetId) {
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (e) {
    Logger.log('Error opening spreadsheet: ' + e.message);
    return null;
  }
}

/**
 * Write expenses to Google Sheet
 * @param {Array} expenses - Array of expense objects
 * @returns {number} Number of expenses written
 */
function writeExpensesToSheet(expenses) {
  if (!expenses || expenses.length === 0) {
    Logger.log('No expenses to write');
    return 0;
  }
  
  const spreadsheet = getOrCreateSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  
  // Get existing data for deduplication
  const existingData = getExistingExpenses(sheet);
  const existingKeys = new Set(existingData.map(e => 
    e.date + '|' + e.amount + '|' + e.merchant
  ));
  
  // Filter out duplicates
  const newExpenses = expenses.filter(expense => {
    const key = formatDate(expense.date) + '|' + expense.amount + '|' + expense.merchant;
    return !existingKeys.has(key);
  });
  
  if (newExpenses.length === 0) {
    Logger.log('No new expenses to write (all duplicates)');
    return 0;
  }
  
  // Prepare rows for insertion
  const rows = newExpenses.map(expense => [
    formatDate(expense.date),
    expense.currency || 'SGD',
    expense.amount,
    expense.merchant,
    expense.category || 'Other',
    expense.type || 'Card',
    expense.bank || 'Unknown',
    expense.rawDescription || ''
  ]);
  
  // Append to sheet
  const lastRow = sheet.getLastRow();
  const startRow = lastRow + 1;
  const numRows = rows.length;
  const numCols = rows[0].length;
  
  sheet.getRange(startRow, 1, numRows, numCols).setValues(rows);
  
  Logger.log('Wrote ' + newExpenses.length + ' new expenses to sheet');
  return newExpenses.length;
}

/**
 * Get existing expenses from sheet for deduplication
 */
function getExistingExpenses(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return []; // No data except headers
  }
  
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 8);
  const data = dataRange.getValues();
  
  return data.map(row => ({
    date: row[0],
    amount: row[2],
    merchant: row[3]
  }));
}

/**
 * Format date for sheet display
 */
function formatDate(date) {
  if (!date) {
    return '';
  }
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return day + '-' + month + '-' + year;
}

/**
 * Get all expenses from sheet
 */
function getAllExpenses() {
  const spreadsheet = getOrCreateSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return [];
  }
  
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 8);
  return dataRange.getValues();
}

/**
 * Test sheet operations
 */
function testSheetOperations() {
  // Create or get spreadsheet
  const ss = getOrCreateSpreadsheet();
  Logger.log('Spreadsheet URL: ' + ss.getUrl());
  Logger.log('Spreadsheet ID: ' + ss.getId());
  
  // Write test data
  const testExpenses = [{
    date: new Date(),
    amount: '10.00',
    currency: 'SGD',
    merchant: 'Test Merchant',
    category: 'Food',
    type: 'Card',
    bank: 'DBS',
    rawDescription: 'Test description'
  }];
  
  const written = writeExpensesToSheet(testExpenses);
  Logger.log('Written ' + written + ' test expenses');
  
  return ss.getUrl();
}

/**
 * Get spreadsheet URL for user
 */
function getSpreadsheetUrl() {
  const ss = getOrCreateSpreadsheet();
  return ss.getUrl();
}
