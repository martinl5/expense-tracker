/**
 * AI-Powered Parser for Bank Transaction Emails
 * Uses OpenRouter to extract transaction details from ANY bank email
 */

/**
 * Parse email using AI
 * Extracts: date, amount, currency, merchant, type
 * 
 * @param {Object} email - Email object with body, date, bank
 * @returns {Object} Parsed expense data
 */
function parseEmailWithAI(email) {
  const apiKey = getConfig(CONFIG.KEYS.OPENROUTER_API_KEY);
  const model = getConfig(CONFIG.KEYS.MODEL) || CONFIG.DEFAULTS.MODEL;
  
  if (!apiKey) {
    Logger.log('No OpenRouter API key - AI parsing unavailable');
    return null;
  }
  
  const prompt = buildParsingPrompt(email.body);
  
  try {
    const response = callOpenRouterAPI(apiKey, model, prompt);
    const parsed = parseAIResponse(response);
    
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
 * Build the parsing prompt
 */
function buildParsingPrompt(emailBody) {
  const truncatedBody = emailBody.substring(0, 2000); // Limit to avoid token overflow
  
  return `**Role:** You are a data extraction specialist focused on high precision.

**Task:** Extract transaction details from the provided email and format them into a pipe-delimited list.

**Output Schema:**
\`date|amount|currency|merchant|type\`

**Rules for Extraction:**
* **Date:** Convert all dates to \`YYYY-MM-DD\` format.
* **Amount:** Provide only the numerical value (e.g., 12.50). 
* **Currency:** Use the 3-letter ISO code (e.g., USD, EUR, GBP).
* **Merchant:** The name of the business or vendor.
* **Type:** Categorize as "Purchase," "Refund," "Subscription," or "Transfer."
* **Missing Data:** If a field is not found, write "N/A".
* **Constraint:** Return **ONLY** the pipe-delimited rows. Do not include introductory text, headers, or explanations.

**Email Content:**
> ${truncatedBody}`;
}

/**
 * Parse AI response
 * Format expected: date|amount|currency|merchant|type
 */
function parseAIResponse(response) {
  const lines = response.trim().split('\n');
  const firstLine = lines[0];
  
  const parts = firstLine.split('|');
  
  if (parts.length < 5) {
    Logger.log('Invalid AI response format: ' + response);
    return {};
  }
  
  return {
    date: parts[0]?.trim() || null,
    amount: parts[1]?.trim() || null,
    currency: parts[2]?.trim() || null,
    merchant: parts[3]?.trim() || null,
    type: parts[4]?.trim() || null
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

