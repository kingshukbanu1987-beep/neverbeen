import { Companion } from '../../../models/community';

export interface BirthdayCard {
  companion: Companion;
  date: Date;
  year: number;
  exact: string;
  dayOffset: number;
  when: 'today' | 'tomorrow' | 'week' | 'month' | 'later' | 'belated';
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function atNoon(date: Date): Date {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next;
}

function parseDob(value: string | undefined, today: Date): { month: number; day: number; year: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!month || !day) return null;
  return { month: month - 1, day, year };
}

export function birthdayCards(companions: Companion[], today = new Date()): BirthdayCard[] {
  const now = atNoon(today);
  const missingPlan = [0, 1, 3, 5, 8, 12, 18, 24, -1, -4, -9, -16, -22, -28, 35, 50, 70, 100];
  let missing = 0;
  return companions
    .map((companion) => {
      const explicit = parseDob(companion.aboutMeDetails?.dateOfBirth, now);
      let month: number;
      let day: number;
      let year: number;
      if (explicit) {
        month = explicit.month;
        day = explicit.day;
        year = explicit.year;
      } else {
        const offset = missingPlan[missing % missingPlan.length];
        missing += 1;
        const born = new Date(now);
        born.setDate(born.getDate() + offset);
        month = born.getMonth();
        day = born.getDate();
        year = 1988 + (Math.abs(companion.id) % 16);
      }
      const next = new Date(now.getFullYear(), month, day, 12);
      let dayOffset = Math.round((next.getTime() - now.getTime()) / 86_400_000);
      if (dayOffset < -180) dayOffset += 365;
      if (dayOffset > 180) dayOffset -= 365;
      let when: BirthdayCard['when'] = 'later';
      if (dayOffset === 0) when = 'today';
      else if (dayOffset === 1) when = 'tomorrow';
      else if (dayOffset < 0 && dayOffset >= -30) when = 'belated';
      else if (dayOffset > 1 && dayOffset <= 7) when = 'week';
      else if (dayOffset > 7 && next.getMonth() === now.getMonth() && next.getFullYear() === now.getFullYear()) when = 'month';
      return {
        companion,
        date: new Date(year, month, day, 12),
        year,
        exact: `${day} ${MONTHS[month]} ${year}`,
        dayOffset,
        when,
      };
    })
    .sort((a, b) => a.dayOffset - b.dayOffset);
}
