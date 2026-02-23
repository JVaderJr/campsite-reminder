let platformRules = {};
let currentCalcData = {};

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

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function subtractDays(date, days) {
  return addDays(date, -days);
}

function subtractMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

function getBookingOpenDate(arrivalDate, rules) {
  if (rules.bookingWindowType === 'calendar') {
    return subtractMonths(arrivalDate, rules.bookingWindowMonths);
  } else {
    return subtractDays(arrivalDate, rules.bookingWindowDays);
  }
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function calculate() {
  const platformKey = document.getElementById('platform').value;
  const checkoutDateStr = document.getElementById('checkoutDate').value;
  const stayLength = parseInt(document.getElementById('stayLength').value);

  if (!platformKey || !checkoutDateStr || isNaN(stayLength)) {
    alert('Please fill in all fields.');
    return;
  }

  const rules = platformRules[platformKey];
  const checkoutDate = new Date(checkoutDateStr + 'T12:00:00');
  const desiredArrival = subtractDays(checkoutDate, stayLength);
  const bookingDate = getBookingOpenDate(desiredArrival, rules);
  const bufferStart = desiredArrival;
  const cancelDate = getBookingOpenDate(desiredArrival, rules);

  currentCalcData = {
    bookingDate,
    cancelDate,
    bufferStart,
    checkoutDate,
    desiredArrival,
    stayLength,
    rules
  };

  document.getElementById('stayInfo').innerHTML =
    '<strong>Arrival:</strong> ' + formatDate(desiredArrival) + '<br>' +
    '<strong>Checkout:</strong> ' + formatDate(checkoutDate) + '<br>' +
    '<strong>Stay:</strong> ' + stayLength + ' nights';

  document.getElementById('bookingInfo').innerHTML =
    '<strong>Set a reminder for: ' + formatDate(bookingDate) + ' at ' + rules.openTime + '</strong><br><br>' +
    'On this date, book a <strong>' + rules.maxStayDays + '-night buffer block</strong> starting ' +
    '<strong>' + formatDate(bufferStart) + '</strong> through <strong>' + formatDate(checkoutDate) + '</strong>.<br><br>' +
    'This secures your checkout date. You will cancel the early dates in Reminder 2.';

  document.getElementById('cancelInfo').innerHTML =
    '<strong>Set a reminder for: ' + formatDate(cancelDate) + ' at ' + rules.openTime + '</strong><br><br>' +
    'On this date, your actual arrival date (<strong>' + formatDate(desiredArrival) + '</strong>) ' +
    'opens for booking. Log in and <strong>cancel or modify</strong> the buffer dates ' +
    '(' + formatDate(bufferStart) + ' through ' + formatDate(checkoutDate) + ') ' +
    '– keeping only your ' + stayLength + '-night stay.';

  document.getElementById('platformNotes').textContent = rules.notes;
  document.getElementById('results').style.display = 'flex';
}

function downloadICS(type) {
  const d = currentCalcData;
  if (!d.bookingDate) return;

  let reminderDate, summary, description;

  if (type === 'booking') {
    reminderDate = d.bookingDate;
    summary = 'Campsite Booking Opens';
    description = 'Book your ' + d.rules.maxStayDays + '-night buffer block starting ' + formatDate(d.bufferStart) + ' through ' + formatDate(d.checkoutDate) + '.';
  } else {
    reminderDate = d.cancelDate;
    summary = 'Campsite Cancel/Modify Buffer';
    description = 'Cancel buffer dates ' + formatDate(d.bufferStart) + ' through ' + formatDate(d.checkoutDate) + '. Keep yo...

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'DTSTART:' + formatICSDate(reminderDate),
    'DTEND:' + formatICSDate(addDays(reminderDate, 1)),
    'SUMMARY:' + summary,
    'DESCRIPTION:' + description,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = type + '-reminder.ics';
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', loadPlatforms);
