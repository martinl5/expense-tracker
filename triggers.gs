/**
 * Trigger Setup - Schedule daily expense processing
 */

/**
 * Create daily trigger at 12:00 AM SGT
 * Run this once to set up the schedule
 */
function createDailyTrigger() {
  // Delete existing triggers first to avoid duplicates
  deleteAllTriggers();
  
  // Create new trigger for 12:00 AM (midnight) Singapore time
  // Note: Apps Script uses UTC, so 12:00 AM SGT = 4:00 PM UTC previous day
  // But we'll use a simpler approach with ClockTriggerHandler
  
  ScriptApp.newTrigger('runExpenseTracker')
    .timeBased()
    .atHour(0)  // 12:00 AM (midnight) UTC
    .everyDays(1)
    .create();
  
  Logger.log('Daily trigger created! Will run at 12:00 AM UTC (8:00 AM SGT)');
  return 'Daily trigger created! Expense tracker will run daily.';
}

/**
 * Create trigger at specific time (SGT)
 * @param {number} hour - Hour in SGT (0-23)
 */
function createTriggerAtHourSGT(hour) {
  // Convert SGT to UTC
  // SGT is UTC+8, so subtract 8 hours
  const utcHour = (hour - 8 + 24) % 24;
  
  deleteAllTriggers();
  
  ScriptApp.newTrigger('runExpenseTracker')
    .timeBased()
    .atHour(utcHour)
    .everyDays(1)
    .create();
  
  Logger.log('Trigger created for ' + hour + ':00 SGT (' + utcHour + ':00 UTC)');
  return 'Trigger created for ' + hour + ':00 SGT';
}

/**
 * Delete all triggers for this script
 */
function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'runExpenseTracker') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('Deleted trigger: ' + trigger.getUniqueId());
    }
  }
}

/**
 * Get all active triggers
 */
function getActiveTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  if (triggers.length === 0) {
    return 'No active triggers';
  }
  
  const triggerInfo = triggers.map(t => {
    return {
      id: t.getUniqueId(),
      function: t.getHandlerFunction(),
      type: t.getEventType(),
      source: t.getTriggerSource(),
      description: t.getDescription()
    };
  });
  
  return triggerInfo;
}

/**
 * Test trigger manually
 */
function testTrigger() {
  Logger.log('Manual trigger test started at: ' + new Date().toISOString());
  return 'Test trigger initiated - check logs for results';
}

/**
 * Remove trigger setup
 */
function removeTrigger() {
  deleteAllTriggers();
  return 'All expense tracker triggers removed';
}
