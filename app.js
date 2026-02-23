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
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatICSDate(date) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}T170000Z`;
}

function calculate() {
  const platformKey = document.getElementById('platform').value;
  const checkoutDateInput = document.getElementById('checkoutDate').value;
  const stayLength = parseInt(document.getElementById('stayLength').value);

  if (!platformKey || !checkoutDateInput || isNaN(stayLength)) return;

  const rules = platformRules[platformKey];
  if (!rules) return;

  const checkoutDate = new Date(checkoutDateInput + 'T12:00:00');
  const desiredArrival = subtractDays(checkoutDate, stayLength);
  const bufferStart = desiredArrival;
  const bookingDate = getBookingOpenDate(desiredArrival, rules);
  const cancelDate = getBookingOpenDate(desiredArrival, rules);

  currentCalcData = {
    desiredArrival,
    checkoutDate,
    bufferStart,
    bookingDate,
    cancelDate,
    rules,
    stayLength
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
