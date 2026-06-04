/**
 * Gmail Service - Search and fetch bank transaction emails
 */

// Your personal email accounts that forward bank emails.
// IMPORTANT: Add your forwarding address(es) here before running the script.
// Example: const PERSONAL_ACCOUNTS = ['your-email@gmail.com'];
const PERSONAL_ACCOUNTS = [];

// Bank email addresses
//ADD ANY OTHER BANKS HERE
const BANK_ADDRESSES = [
  'unialerts@uobgroup.com',
  'no-reply@gxs.com.sg', 
  'noreply@notify.ocbc.com',
  'paylah.alert@dbs.com',
  'ibanking.alert@dbs.com',
  'from_us@trustbank.sg'
];

/**
 * Get all new bank transaction emails since last run
 */
function getNewBankEmails() {
  const lastRunDate = getLastRunDate();
  
  if (!lastRunDate) {
    Logger.log('No last run date found, returning empty array');
    return [];
  }
  
  // Convert to Gmail date format (requires YYYY/MM/DD)
  const date = new Date(lastRunDate);
  const dateStr = formatDateForGmail(date);
  
  // Build search query
  const query = buildSearchQuery(dateStr);
  
  Logger.log('Searching for emails with query: ' + query);
  
  const threads = GmailApp.search(query);
  
  if (threads.length === 0) {
    Logger.log('No new emails found');
    return [];
  }
  
  // Get messages from threads
  const emails = [];
  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      const email = extractEmailData(message);
      if (email) {
        emails.push(email);
      }
    }
  }
  
  Logger.log('Found ' + emails.length + ' new bank emails');
  return emails;
}

/**
 * Build Gmail search query
 */
function buildSearchQuery(dateStr) {
  // Build the FROM clause with personal accounts and bank addresses - NO SUBJECT FILTER
  const fromClause = 'from:(' + PERSONAL_ACCOUNTS.join(' OR ') + ' OR ' + BANK_ADDRESSES.join(' OR ') + ')';
  
  // Combine with date filter only
  const query = fromClause + ' after:' + dateStr;
  
  return query;
}

/**
 * Format date for Gmail search (YYYY/MM/DD)
 */
function formatDateForGmail(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '/' + month + '/' + day;
}

/**
 * Extract relevant data from email
 */
function extractEmailData(message) {
  try {
    const from = message.getFrom();
    const subject = message.getSubject();
    const date = message.getDate();
    const body = message.getPlainBody() || '';
    const htmlBody = message.getRawContent() || '';
    
    // Build email object for detection
    const emailData = {
      from: from,
      subject: subject,
      body: body
    };
    
    // Detect bank from email content
    const bank = detectBank(emailData);
    
    if (!bank) {
      Logger.log('Could not detect bank from: ' + from);
      return null;
    }
    
    return {
      from: from,
      subject: subject,
      date: date,
      body: body,
      htmlBody: htmlBody,
      bank: bank,
      messageId: message.getId()
    };
  } catch (e) {
    Logger.log('Error extracting email data: ' + e.message);
    return null;
  }
}

/**
 * Detect bank from email content
 */
function detectBank(email) {
  const allText = (email.from || '') + ' ' + (email.body || '');
  const bank = detectBankByPattern(allText);
  if (!bank) Logger.log('Could not detect bank from: ' + allText.substring(0, 100));
  return bank;
}

/**
 * Mark email as processed (add label)
 * Optional - can be used for tracking
 */
function markEmailAsProcessed(messageId) {
  try {
    const message = GmailApp.getMessageById(messageId);
    // Could add a label here if needed
    // const label = GmailApp.getUserLabelByName('Processed');
    // message.addLabel(label);
  } catch (e) {
    Logger.log('Error marking email as processed: ' + e.message);
  }
}

/**
 * Manual search for testing
 * Returns emails from the last 7 days
 */
function testGetEmails() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const dateStr = formatDateForGmail(sevenDaysAgo);
  const query = buildSearchQuery(dateStr);
  
  Logger.log('Test query: ' + query);
  
  const threads = GmailApp.search(query);
  
  const emails = [];
  for (const thread of threads) {
    const messages = thread.getMessages();
    for (const message of messages) {
      const email = extractEmailData(message);
      if (email) {
        emails.push(email);
      }
    }
  }
  
  return emails;
}
