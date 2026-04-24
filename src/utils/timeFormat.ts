import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday.js';
import isYesterday from 'dayjs/plugin/isYesterday.js';

dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.locale('en');

/**
 * For the left-hand Chat List (Compact display)
 */
export const formatChatListTime = (timestamp: string | number): string => {
  if (!timestamp) return '';
  const date = dayjs(timestamp);

  if (date.isToday()) {
    return date.format('HH:mm');
  }
  if (date.isYesterday()) {
    return 'Yesterday';
  }
  if (dayjs().diff(date, 'day') < 7) {
    return date.format('dddd'); // e.g., Wednesday
  }
  if (date.isSame(dayjs(), 'year')) {
    return date.format('MM/DD');
  }
  return date.format('YYYY/MM/DD');
};

/**
 * For the Chat Panel (Precise display when rendered)
 */
export const formatMessageBubbleTime = (timestamp: string | number): string => {
  if (!timestamp) return '';
  const date = dayjs(timestamp);

  if (date.isToday()) {
    return date.format('HH:mm');
  }
  if (date.isYesterday()) {
    return `Yesterday ${date.format('HH:mm')}`;
  }
  if (date.isSame(dayjs(), 'year')) {
    return date.format('MM/DD HH:mm');
  }
  return date.format('YYYY/MM/DD HH:mm');
};

/**
 * Determine if the time bubble should be rendered (5-minute rule)
 */
export const shouldShowTimeBubble = (
  prevTimestamp: string | number | undefined,
  currTimestamp: string | number
): boolean => {
  if (!prevTimestamp) return true; // Always show for the first message
  if (!currTimestamp) return false;

  const prev = dayjs(prevTimestamp);
  const curr = dayjs(currTimestamp);

  // Return true if the gap is greater than 5 minutes
  return curr.diff(prev, 'minute') > 5;
};
