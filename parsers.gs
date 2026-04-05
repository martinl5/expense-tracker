/**
 * AI-Powered Parser for Bank Transaction Emails
 * Uses OpenRouter to extract transaction details from ANY bank email
 */

/**
 * Parse email using AI
 * Extracts: date, amount, currency, merchant, type
 * First classifies as expense vs non-expense
 * 
 * @param {Object} email - Email object with body, date, bank
 * @returns {Object} Parsed expense data or null if not an expense
 */
function parseEmailWithAI(email) {
  const apiKey = getConfig(CONFIG.KEYS.OPENROUTER_API_KEY);
  const model = getConfig(CONFIG.KEYS.MODEL) || CONFIG.DEFAULTS.MODEL;
  
  if (!apiKey) {
    Logger.log('No OpenRouter API key - AI parsing unavailable');
    return null;
  }
  
  Logger.log('Parsing email from: ' + email.from);
  Logger.log('Subject: ' + email.subject);
  
  const prompt = buildParsingPrompt(email.body);
  
  try {
    // Use retry logic for parsing
    const response = callOpenRouterAPIWithRetry(apiKey, model, prompt);
    Logger.log('AI Response: ' + response.substring(0, 200));
    
    const parsed = parseAIResponse(response);
    
    // Check if it's NOT an expense - return null to skip
    if (parsed.isExpense === false) {
      Logger.log('Skipped (not an expense): ' + parsed.reason);
      return null;  // Return null so main.gs doesn't treat this as a failure
    }
    
    // Check if we got valid expense data
    if (!parsed.isExpense || !parsed.amount || parsed.amount === 'N/A') {
      Logger.log('No valid expense data found in email');
      return null;
    }
    
    // Combine with email data
    return {
      date: parsed.date || email.date,
      amount: parsed.amount || '0',
      currency: parsed.currency || 'SGD',
      merchant: parsed.merchant || 'Unknown',
      type: parsed.type || 'Card',
      rawDescription: email.body.substring(0, 500),
      bank: detectBankFromContent(email.body) || email.bank || 'Unknown'
    };
  } catch (e) {
    Logger.log('Error parsing with AI: ' + e.message);
    return null;
  }
}

/**
 * Build the parsing prompt - includes classification step to skip non-expenses
 */
function buildParsingPrompt(emailBody) {
  const truncatedBody = emailBody.substring(0, 2000); // Limit to avoid token overflow
  
  return `**Role:** You are a data extraction specialist focused on high precision.

**Task:** First, determine if this email is about an actual expense/debit transaction. Then, if it is, extract the transaction details.

**Classification Rules:**
- EXPENSE: Real purchase, payment, debit, card transaction, transfer out
- NOT_EXPENSE: Security alerts, login notifications, promotional offers, balance updates, refunds, credit alerts, account updates

**If EXPENSE, output format:**
\`IS_EXPENSE|date|amount|currency|merchant|type\`

**If NOT_EXPENSE, output format:**
\`NOT_EXPENSE|reason\`

**Reason options:** "security_alert", "promotional", "balance_update", "refund_credit", "login_notification", "account_update", "other"

**Rules for Expense Extraction:**
* **Date:** Convert all dates to \`YYYY-MM-DD\` format.
* **Amount:** Provide only the numerical value (e.g., 12.50). 
* **Currency:** Use the 3-letter ISO code (e.g., USD, EUR, GBP).
* **Merchant:** The name of the business or vendor.
* **Type:** Categorize as "Purchase," "Refund," "Subscription," or "Transfer."
* **Missing Data:** If a field is not found, write "N/A".
* **Constraint:** Return **ONLY** the classification + data row. No explanations.

**Email Content:**
> ${truncatedBody}`;
}

/**
 * Parse AI response - handles classification + extraction
 * Format: IS_EXPENSE|date|amount|currency|merchant|type  OR  NOT_EXPENSE|reason
 */
function parseAIResponse(response) {
  // Handle null/empty response
  if (!response || typeof response !== 'string') {
    Logger.log('AI response is null or invalid');
    return {};
  }
  
  const lines = response.trim().split('\n');
  const firstLine = lines[0];
  
  const parts = firstLine.split('|');
  
  // Check if it's NOT_EXPENSE
  if (parts[0] && parts[0].trim().toUpperCase() === 'NOT_EXPENSE') {
    return {
      isExpense: false,
      reason: parts[1]?.trim() || 'unknown'
    };
  }
  
  // Must be EXPENSE - check we have required fields
  if (parts.length < 6) {
    Logger.log('Invalid AI response format: ' + response);
    return {};
  }
  
  return {
    isExpense: true,
    date: parts[1]?.trim() || null,
    amount: parts[2]?.trim() || null,
    currency: parts[3]?.trim() || null,
    merchant: parts[4]?.trim() || null,
    type: parts[5]?.trim() || null
  };
}

/**
 * Detect bank from email content (fallback)
 */
function detectBankFromContent(body) {
  const allText = body;
  
  if (/ocbc|notify\.ocbc\.com/i.test(allText)) return 'OCBC';
  if (/dbs.*card|ibanking\.alert/i.test(allText)) return 'DBS';
  if (/paylah/i.test(allText)) return 'PayLah';
  if (/uob|unialerts/i.test(allText)) return 'UOB';
  if (/trust|trustbank/i.test(allText)) return 'Trust';
  if (/gxs/i.test(allText)) return 'GXS';
  
  return null;
}

/**
 * Main parse function - uses AI
 * Replaces all bank-specific parsers
 */
function parseEmail(email) {
  return parseEmailWithAI(email);
}

