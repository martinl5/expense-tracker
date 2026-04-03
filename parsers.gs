/**
 * Bank-specific parsers for extracting transaction data
 * Parsers for: OCBC, DBS, UOB, Trust, GXS, PayLah
 */

/**
 * Parse OCBC credit card transaction
 * Pattern: "SGD4.50 was charged at 17:03 on 28-Mar-26 to your card (-3061) at YA KUN KAYA TOAST"
 */
function parseOCBC(email) {
  try {
    const body = email.body;
    
    // Extract amount - SGD followed by number
    const amountMatch = body.match(/SGD?([\d,]+\.\d+)/i);
    const amount = amountMatch ? amountMatch[1] : null;
    
    // Extract merchant - after "at" and before end of sentence
    const merchantMatch = body.match(/at\s+(?:your card\s+)?[\(-][\d]+\)\s+at\s+(.+?)(?:\.|did not|unauthorised)/i);
    const merchant = merchantMatch ? merchantMatch[1].trim() : null;
    
    // Extract date
    const dateMatch = body.match(/(\d{1,2})-(\w{3})-(\d{2})/);
    let date = email.date;
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseMonth(dateMatch[2]);
      const year = 2000 + parseInt(dateMatch[3]);
      date = new Date(year, month, day);
    }
    
    // Extract card last 4
    const cardMatch = body.match(/\((-?\d{4})\)/);
    const cardLast4 = cardMatch ? cardMatch[1] : null;
    
    if (!amount || !merchant) {
      Logger.log('OCBC parse failed - amount: ' + amount + ', merchant: ' + merchant);
      return null;
    }
    
    return {
      date: date,
      amount: amount,
      currency: 'SGD',
      merchant: merchant,
      type: 'Card',
      cardLast4: cardLast4,
      rawDescription: body.substring(0, 500)
    };
  } catch (e) {
    Logger.log('Error parsing OCBC email: ' + e.message);
    return null;
  }
}

/**
 * Parse DBS credit card transaction
 * Pattern: "Amount: USD1070.10...To: UNITED...Date: 12 Mar 10:18 (SGT)"
 */
function parseDBS(email) {
  try {
    const body = email.body;
    const htmlBody = email.htmlBody;
    
    // Extract amount - look for Amount: followed by currency and number
    const amountMatch = body.match(/Amount:\s*(USD|SGD|HKD|GBP|EUR)?([\d,]+\.\d+)/i);
    const amount = amountMatch ? amountMatch[2] : null;
    const currency = amountMatch ? (amountMatch[1] || 'SGD') : 'SGD';
    
    // Extract merchant/recipient - after "To:"
    const toMatch = body.match(/To:\s*(\S+)/i);
    const merchant = toMatch ? toMatch[1].replace(/[^a-zA-Z\s]/g, '').trim() : null;
    
    // Extract date
    const dateMatch = body.match(/Date\s*[&:]\s*(\d{1,2})\s+(\w{3})\s+(\d{1,2}:\d{2})/i);
    let date = email.date;
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseMonth(dateMatch[2]);
      const year = new Date().getFullYear();
      const time = dateMatch[3];
      date = new Date(year, month, day);
    }
    
    // Extract card last 4
    const cardMatch = body.match(/(?:card ending|posb card)\s+(\d{4})/i);
    const cardLast4 = cardMatch ? cardMatch[1] : null;
    
    if (!amount || !merchant) {
      Logger.log('DBS parse failed - amount: ' + amount + ', merchant: ' + merchant);
      return null;
    }
    
    return {
      date: date,
      amount: amount,
      currency: currency,
      merchant: merchant,
      type: 'Card',
      cardLast4: cardLast4,
      rawDescription: body.substring(0, 500)
    };
  } catch (e) {
    Logger.log('Error parsing DBS email: ' + e.message);
    return null;
  }
}

/**
 * Parse UOB funds transfer
 * Pattern: "You made/scheduled a funds transfer(s) of SGD 1000.00 to DBS BANK LTD a/c ending 4100 from your a/c ending 4562 at 1:33PM SGT, 16 Feb 26"
 */
function parseUOB(email) {
  try {
    const body = email.body;
    
    // Extract amount
    const amountMatch = body.match(/SGD?([\d,]+\.\d+)/i);
    const amount = amountMatch ? amountMatch[1] : null;
    
    // Extract recipient - after "to" and before "a/c"
    const toMatch = body.match(/to\s+([A-Z\s]+?)\s+a\/c/i);
    const recipient = toMatch ? toMatch[1].replace(/LTD|INC|PTE/gi, '').trim() : null;
    
    // Extract date
    const dateMatch = body.match(/(\d{1,2})\s+(\w{3})\s+(\d{2})/i);
    let date = email.date;
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseMonth(dateMatch[2]);
      const year = 2000 + parseInt(dateMatch[3]);
      date = new Date(year, month, day);
    }
    
    // Extract account last 4
    const accountMatch = body.match(/a\/c ending\s+(\d{4})/i);
    const accountLast4 = accountMatch ? accountMatch[1] : null;
    
    if (!amount || !recipient) {
      Logger.log('UOB parse failed - amount: ' + amount + ', recipient: ' + recipient);
      return null;
    }
    
    return {
      date: date,
      amount: amount,
      currency: 'SGD',
      merchant: recipient,
      type: 'Transfer',
      accountLast4: accountLast4,
      rawDescription: body.substring(0, 500)
    };
  } catch (e) {
    Logger.log('Error parsing UOB email: ' + e.message);
    return null;
  }
}

/**
 * Parse Trust Bank transaction
 * Pattern: "0% FX fees! You've spent HKD 84.00 using Trust Link card at BAKEHOUSE SOCHO HK on 3 Apr 2026 08:53SGT"
 */
function parseTrust(email) {
  try {
    const body = email.body;
    const htmlBody = email.htmlBody;
    
    // Extract amount and currency
    const amountMatch = body.match(/(?:spent|spent\s+HKD)\s+([\d,]+\.\d+)\s+(?:using\s+)?(?:Trust Link card\s+)?at\s+(.+?)(?:\.|on\s+\d)/i);
    
    let amount, currency, merchant;
    
    if (amountMatch) {
      amount = amountMatch[1];
      merchant = amountMatch[2].trim();
      currency = body.includes('HKD') ? 'HKD' : 
                  body.includes('USD') ? 'USD' : 'SGD';
    } else {
      // Try alternate pattern
      const altMatch = body.match(/spent\s+(USD|HKD|SGD|GBP)?\s*([\d,]+\.\d+)\s+at\s+(.+?)\s+on/i);
      if (altMatch) {
        currency = altMatch[1] || 'SGD';
        amount = altMatch[2];
        merchant = altMatch[3].trim();
      }
    }
    
    // Extract date
    const dateMatch = body.match(/on\s+(\d{1,2})\s+(\w{3})\s+(\d{4})/i);
    let date = email.date;
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseMonth(dateMatch[2]);
      const year = parseInt(dateMatch[3]);
      date = new Date(year, month, day);
    }
    
    if (!amount || !merchant) {
      Logger.log('Trust parse failed - amount: ' + amount + ', merchant: ' + merchant);
      return null;
    }
    
    return {
      date: date,
      amount: amount,
      currency: currency || 'SGD',
      merchant: merchant,
      type: 'Card',
      rawDescription: body.substring(0, 500)
    };
  } catch (e) {
    Logger.log('Error parsing Trust email: ' + e.message);
    return null;
  }
}

/**
 * Parse GXS transaction
 * Pattern: "You spent $8.50 on Grab with your GXS account" or "You spent S$8.50"
 */
function parseGXS(email) {
  try {
    const body = email.body;
    
    // Extract amount and currency
    const amountMatch = body.match(/(?:spent\s+\$?|spent\s+)(SGD|USD|HKD)?\$?([\d,]+\.\d+)/i);
    const currency = amountMatch ? (amountMatch[1] || 'SGD') : 'SGD';
    const amount = amountMatch ? amountMatch[2] : null;
    
    // Extract merchant - after "on" and before "with"
    const merchantMatch = body.match(/on\s+([A-Za-z\s]+?)\s+with/i);
    const merchant = merchantMatch ? merchantMatch[1].trim() : 'Unknown';
    
    // Extract date
    const dateMatch = body.match(/on\s+(\d{1,2})\s+(\w{3})\s+(\d{4})/i);
    let date = email.date;
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseMonth(dateMatch[2]);
      const year = parseInt(dateMatch[3]);
      date = new Date(year, month, day);
    }
    
    if (!amount) {
      Logger.log('GXS parse failed - amount: ' + amount);
      return null;
    }
    
    return {
      date: date,
      amount: amount,
      currency: currency,
      merchant: merchant,
      type: 'Card',
      rawDescription: body.substring(0, 500)
    };
  } catch (e) {
    Logger.log('Error parsing GXS email: ' + e.message);
    return null;
  }
}

/**
 * Parse PayLah transaction
 * Pattern: "PayLah! Bill Payment Transfer...Amount: SGD8.74...To: LAZADA"
 */
function parsePayLah(email) {
  try {
    const body = email.body;
    
    // Determine if it's a transfer or payment
    const isTransfer = body.includes('Transfer') || body.includes('funds transfer');
    const type = isTransfer ? 'Transfer' : 'Payment';
    
    // Extract amount
    const amountMatch = body.match(/Amount:\s*SGD?([\d,]+\.\d+)/i);
    const amount = amountMatch ? amountMatch[1] : null;
    
    // Extract recipient - after "To:"
    const toMatch = body.match(/To:\s*([^\n<]+)/i);
    const recipient = toMatch ? toMatch[1].trim() : null;
    
    // Extract date
    const dateMatch = body.match(/dated\s+(\d{1,2})\s+(\w{3})/i);
    let date = email.date;
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseMonth(dateMatch[2]);
      const year = new Date().getFullYear();
      date = new Date(year, month, day);
    }
    
    // Extract wallet last 4
    const walletMatch = body.match(/Wallet\s*\([^)]*(\d{4})\)/i);
    const walletLast4 = walletMatch ? walletMatch[1] : null;
    
    if (!amount) {
      Logger.log('PayLah parse failed - amount: ' + amount);
      return null;
    }
    
    return {
      date: date,
      amount: amount,
      currency: 'SGD',
      merchant: recipient || 'Unknown',
      type: type,
      walletLast4: walletLast4,
      rawDescription: body.substring(0, 500)
    };
  } catch (e) {
    Logger.log('Error parsing PayLah email: ' + e.message);
    return null;
  }
}

/**
 * Main parser function - routes to appropriate bank parser
 */
function parseEmail(email) {
  const bank = email.bank;
  
  switch (bank) {
    case 'OCBC':
      return parseOCBC(email);
    case 'DBS':
      return parseDBS(email);
    case 'UOB':
      return parseUOB(email);
    case 'Trust':
      return parseTrust(email);
    case 'GXS':
      return parseGXS(email);
    case 'PayLah':
      return parsePayLah(email);
    default:
      Logger.log('Unknown bank: ' + bank);
      return null;
  }
}

/**
 * Helper: Parse month abbreviation to number
 */
function parseMonth(monthStr) {
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  return months[monthStr] || 0;
}

/**
 * Test individual parser
 */
function testParsers() {
  const testEmail = {
    body: 'You made/scheduled a funds transfer(s) of SGD 1000.00 to DBS BANK LTD a/c ending 4100 from your a/c ending 4562 at 1:33PM SGT, 16 Feb 26. If unauthorised, call UOB 24/7 Fraud Hotline.',
    htmlBody: '',
    date: new Date(),
    bank: 'UOB'
  };
  
  const result = parseEmail(testEmail);
  Logger.log('Test result: ' + JSON.stringify(result));
  return result;
}
