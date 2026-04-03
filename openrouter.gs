/**
 * OpenRouter API Service - LLM-powered expense categorization
 * Model: qwen/qwen3.6-plus:free (or fallback)
 */

/**
 * Categorize expense using OpenRouter API
 * @param {string} description - Merchant/description text
 * @param {string} defaultCategory - Default category if API fails
 * @returns {string} Category
 */
function categorizeExpense(description, defaultCategory) {
  const apiKey = getConfig(CONFIG.KEYS.OPENROUTER_API_KEY);
  const model = getConfig(CONFIG.KEYS.MODEL) || CONFIG.DEFAULTS.MODEL;
  
  if (!apiKey) {
    Logger.log('No OpenRouter API key found, using default category');
    return defaultCategory || 'Other';
  }
  
  const prompt = buildCategorizationPrompt(description);
  
  try {
    const response = callOpenRouterAPI(apiKey, model, prompt);
    const category = parseCategoryResponse(response, defaultCategory);
    
    Logger.log('Categorized "' + description + '" as "' + category + '"');
    return category;
  } catch (e) {
    Logger.log('Error calling OpenRouter API: ' + e.message);
    return defaultCategory || 'Other';
  }
}

/**
 * Build categorization prompt
 */
function buildCategorizationPrompt(description) {
  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Transfer', 'Other'];
  
  return `Categorize this expense in one word only.
Description: "${description}"
Categories: ${categories.join(', ')}

Respond with ONLY the category name, nothing else.`;
}

/**
 * Call OpenRouter API
 */
function callOpenRouterAPI(apiKey, model, prompt) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  const payload = {
    model: model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 500
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://script.google.com',
      'X-Title': 'Expense Tracker'
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());
  
  if (json.error) {
    throw new Error(json.error.message);
  }
  
  return json.choices[0].message.content.trim();
}

/**
 * Parse category response from LLM
 */
function parseCategoryResponse(response, defaultCategory) {
  const validCategories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Transfer', 'Other'];
  
  // Clean up response
  const category = response.replace(/[."\n]/g, '').trim();
  
  // Check if valid category
  if (validCategories.includes(category)) {
    return category;
  }
  
  // Try to match partial category
  for (const valid of validCategories) {
    if (category.toLowerCase().includes(valid.toLowerCase())) {
      return valid;
    }
  }
  
  // Default if no match
  return defaultCategory || 'Other';
}

/**
 * Batch categorize expenses
 * @param {Array} expenses - Array of expense objects with merchant field
 * @returns {Array} Expenses with added category field
 */
function batchCategorize(expenses) {
  if (!expenses || expenses.length === 0) {
    return [];
  }
  
  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    const description = expense.merchant || expense.rawDescription || '';
    
    // Skip if already categorized
    if (!expense.category) {
      expense.category = categorizeExpense(description, 'Other');
    }
    
    // Small delay to avoid rate limiting
    if (i > 0 && i % 5 === 0) {
      Utilities.sleep(500);
    }
  }
  
  return expenses;
}

/**
 * Test categorization
 */
function testCategorization() {
  const testDescriptions = [
    'YA KUN KAYA TOAST',
    'Grab ride',
    'Netflix subscription',
    'SP Group utilities',
    'LAZADA shopping'
  ];
  
  for (const desc of testDescriptions) {
    const category = categorizeExpense(desc, 'Other');
    Logger.log(desc + ' -> ' + category);
  }
  
  return testDescriptions.map(d => ({ description: d, category: categorizeExpense(d, 'Other') }));
}
