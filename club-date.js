export function formatClubDate(value) {
  return String(value ?? '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1');
}

export function formatClubDatesInText(value) {
  return String(value ?? '').replace(/\b\d{4}-\d{2}-\d{2}(?![\dT-])/g, formatClubDate);
}
