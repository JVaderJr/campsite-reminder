let platformRules = {};
let currentCalcData = {};

// Load platform rules from platforms.json
async function loadPlatforms() {
  try {
    const res = await fetch('platforms.json');
    platformRules = await res.json();
    const select = document.getElementById('platform');
    select.innerHTML = '<option value="">-- Select a Platform --</option>';
    for (const [key, platform] of Object.entries(platformRules)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = platform.name;
      select.appendChild(option);
    }
  } catch (e) {
    console.error('Failed to load platforms.json', e);
  }
}

// Add days to a date
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Subtract days from a date
function subtractDays(date, days) {
  return addDays(date, -days);
}

// Format date as readable string
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// Format date as YYYYMMDD for ICS
function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('T')[0];
}

function calculate() {
  const platformKey = document.getElementById('platform').value;
  const checkoutDateStr = document.getElementById('checkoutDate').value;
  const stayLength = parseInt(document.getElementById('stayLength').value);

  if (!platformKey || !checkoutDateStr || !stayLength) {
    alert('Please fill in all fields.');
    return;
  }

  const rules = platformRules[platformKey];
  const checkoutDate = new Date(checkoutDateStr + 'T12:00:00');

  // Desired arrival = checkout minus stay length
  const desiredArrival = subtractDays(checkoutDate, stayLength);

  // Buffer block start = checkout minus maxStayDays
  const bufferStart = subtractDays(checkoutDate, rules.maxStayDays);

  // Booking date = bufferStart minus bookingWindowDays
  const bookingDate = subtractDays(bufferStart, rules.bookingWindowDays);

  // Cancel date = desired arrival minus bookingWindowDays
  const cancelDate = subtractDays(desiredArrival, rules.bookingWindowDays);

  // Store for ICS generation
  currentCalcData = {
    platform: rules,
    checkoutDate,
    desiredArrival,
    bufferStart,
    bookingDate,
    cancelDate,
    stayLength,
    platformKey
  };

  // Display results
  document.getElementById('stayInfo').innerHTML =
    `<strong>Arrival:</strong> ${formatDate(desiredArrival)}<br>
     <strong>Checkout:</strong> ${formatDate(checkoutDate)}<br>
     <strong>Stay:</strong> ${stayLength} nights`;

  document.getElementById('bookingInfo').innerHTML =
    `<strong>Set a reminder for: ${formatDate(bookingDate)} at ${rules.openTime}</strong><br><br>
     On this date, book a <strong>${rules.maxStayDays}-night buffer block</strong> starting
     <strong>${formatDate(bufferStart)}</strong> through <strong>${formatDate(checkoutDate)}</strong>.<br><br>
     This secures your checkout date. You will cancel the early dates in Reminder 2.`;

  document.getElementById('cancelInfo').innerHTML =
    `<strong>Set a reminder for: ${formatDate(cancelDate)} at ${rules.openTime}</strong><br><br>
     On this date, your actual arrival date (<strong>${formatDate(desiredArrival)}</strong>)
     opens for booking. Log in and <strong>cancel or modify</strong> the buffer dates
     (${formatDate(bufferStart)} through ${formatDate(subtractDays(desiredArrival, 1))})
     - keeping only your ${stayLength}-night stay.`;

  document.getElementById('platformNotes').textContent = rules.notes;
  document.getElementById('results').style.display = 'flex';
}

function downloadICS(type) {
  const d = currentCalcData;
  if (!d.bookingDate) return;

  let reminderDate, summary, description;

  if (type === 'booking') {
    reminderDate = d.bookingDate;
    summary = 'BOOK CAMPSITE - ' + d.platform.name;
    description = 'Book a ' + d.platform.maxStayDays + '-night buffer block starting '
      + formatDate(d.bufferStart) + ' through ' + formatDate(d.checkoutDate)
      + ' on ' + d.platform.url + '. Platform opens at ' + d.platform.openTime + '.';
  } else {
    reminderDate = d.cancelDate;
    summary = 'CANCEL BUFFER DATES - ' + d.platform.name;
    description = 'Your real arrival (' + formatDate(d.desiredArrival) + ') is now bookable. '
      + 'Log into ' + d.platform.url + ' and cancel/modify dates '
      + formatDate(d.bufferStart) + ' through ' + formatDate(subtractDays(d.desiredArrival, 1))
      + ' to keep only your ' + d.stayLength + '-night stay.';
  }

  const uid = 'campsite-' + type + '-' + Date.now() + '@campsitereminder';
  const dateStr = formatICSDate(reminderDate);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campsite Reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTART;VALUE=DATE:' + dateStr,
    'DTEND;VALUE=DATE:' + dateStr,
    'SUMMARY:' + summary,
    'DESCRIPTION:' + description.replace(/\n/g, '\\n'),
    'BEGIN:VALARM',
    'TRIGGER:-PT0S',
    'ACTION:DISPLAY',
    'DESCRIPTION:' + summary,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campsite-' + type + '-reminder.ics';
  a.click();
  URL.revokeObjectURL(url);
}

// Initialize
loadPlatforms();
