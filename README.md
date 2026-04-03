# Expense Tracker

Automated expense tracking from Singapore bank email alerts using Google Apps Script + AI.

## Features

- **AI-Powered Parsing**: Uses OpenRouter AI to extract transaction details from ANY bank
- **Bank-Agnostic**: Works with any bank - no need to add new parsers
- **Auto-Categorization**: AI categorizes expenses (Food, Transport, Shopping, etc.)
- **Daily Automation**: Runs automatically every day
- **Google Sheets**: Outputs to "Expense Tracker" spreadsheet
- **Deduplication**: Avoids duplicate entries

## How It Works

1. Forward bank transaction emails to a dedicated Gmail address
2. The script searches for emails from your personal accounts (forwarding)
3. **AI parses** each email to extract: date, amount, currency, merchant, type
4. AI categorizes the expense
5. Writes to Google Sheets

## Supported Banks

**Any bank!** The AI parser works with all banks automatically - no bank-specific code needed.

Tested with:
- OCBC
- DBS
- UOB
- Trust Bank
- GXS
- PayLah

## Setup

### 1. Enable Google APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Go to **APIs & Services** → **Library**
4. Enable:
   - **Gmail API**
   - **Google Sheets API**
   - **Google Drive API** (for DriveApp)

### 2. Create Google Apps Script

1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Create these 7 files:
   - `config.gs`
   - `gmail_service.gs`
   - `parsers.gs`
   - `openrouter.gs`
   - `sheets_service.gs`
   - `triggers.gs`
   - `main.gs`

### 3. Configure Email Accounts

In `gmail_service.gs`, update these with your personal email addresses:

```javascript
const PERSONAL_ACCOUNTS = ['your-email-1@gmail.com', 'your-email-2@gmail.com'];
```

### 4. Set OpenRouter API Key

1. Get a free API key at: [https://openrouter.ai/](https://openrouter.ai/)
2. In Apps Script, run:
   ```javascript
   setOpenRouterApiKey("your-api-key")
   ```

Or set it manually in **File** → **Project properties** → **Script properties**

### 5. First-Time Setup

1. In Apps Script, run `firstTimeSetup()`
2. Authorize the script (it will ask for Gmail and Sheets permissions)
3. A new spreadsheet "Expense Tracker" will be created
4. Daily trigger will be set

### 6. Forward Bank Emails

Configure your bank apps to forward transaction alerts to your dedicated Gmail address.

The script will automatically process these emails daily.

## Usage

### Manual Run
Select `runExpenseTracker` and click **Run**

### View Spreadsheet
Run `getSpreadsheetUrl()` to get the link

### Check Logs
Click **View** → **Logs** to see what's happening

## Sheet Columns

| Column | Description |
|--------|-------------|
| A | Date (DD-MM-YYYY) |
| B | Currency (SGD, USD, HKD, etc.) |
| C | Amount |
| D | Merchant/Recipient |
| E | Category (AI-generated) |
| F | Type (Purchase, Transfer, Subscription, Refund) |
| G | Bank |
| H | Raw Description |

## Files

| File | Purpose |
|------|---------|
| `config.gs` | Configuration & ScriptProperties |
| `gmail_service.gs` | Fetch emails from Gmail |
| `parsers.gs` | AI-powered parser (works with any bank) |
| `openrouter.gs` | OpenRouter API calls |
| `sheets_service.gs` | Write to Google Sheets |
| `triggers.gs` | Daily trigger setup |
| `main.gs` | Main orchestrator |

## Configuration

### Change Spreadsheet Name
In Script Properties, set:
```
SPREADSHEET_NAME = "My Expenses"
```

### Change Trigger Time
```javascript
// Run with desired hour (SGT):
createTriggerAtHourSGT(6);  // 6:00 AM SGT
createTriggerAtHourSGT(8);  // 8:00 AM SGT
```

### Change AI Model
In Script Properties, set:
```
MODEL = "qwen/qwen3.6-plus:free"
// Or use any model from openrouter.ai
```

## AI Parser

The AI parser uses this prompt to extract transaction details:

```
**Role:** You are a data extraction specialist focused on high precision.

**Task:** Extract transaction details from the provided email and format them into a pipe-delimited list.

**Output Schema:**
`date|amount|currency|merchant|type`

**Rules for Extraction:**
* **Date:** Convert all dates to `YYYY-MM-DD` format.
* **Amount:** Provide only the numerical value (e.g., 12.50). 
* **Currency:** Use the 3-letter ISO code (e.g., USD, EUR, GBP).
* **Merchant:** The name of the business or vendor.
* **Type:** Categorize as "Purchase," "Refund," "Subscription," or "Transfer."
* **Missing Data:** If a field is not found, write "N/A".
```

## Troubleshooting

### No emails found
- Check that bank emails are being forwarded to your dedicated email
- Verify the email addresses in `PERSONAL_ACCOUNTS` are correct
- Run `testGetAllEmails()` to debug

### AI parsing fails
- Check Logs for errors
- Verify OpenRouter API key is set correctly

### Categorization not working
- Verify OpenRouter API key is set correctly
- Check Logs for API errors

### Trigger not running
- Run `getActiveTriggers()` to verify
- Run `createDailyTrigger()` to recreate

## Security

- API keys are stored in Google Apps Script **Script Properties** (encrypted)
- No credentials are hardcoded in the source files
- The script only has access to Gmail (read) and Sheets (read/write)

## License

MIT
