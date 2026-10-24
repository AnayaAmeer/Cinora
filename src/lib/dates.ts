export type BakeDay = {
  iso: string;
  weekday: string;
  dayNum: string;
  month: string;
};

const TIME_ZONE = "Asia/Karachi";

export function karachiDateISO(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function karachiNoon(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 7, 0, 0));
}

export function upcomingBakeDays(count = 12): BakeDay[] {
  const today = karachiDateISO(new Date());
  const [year, month, day] = today.split("-").map(Number);
  const days: BakeDay[] = [];

  for (let offset = 1; offset <= count; offset += 1) {
    const date = new Date(Date.UTC(year, month - 1, day + offset, 7, 0, 0));
    const iso = karachiDateISO(date);
    days.push({
      iso,
      weekday: new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        weekday: "short",
      }).format(date),
      dayNum: new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        day: "numeric",
      }).format(date),
      month: new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE,
        month: "short",
      }).format(date),
    });
  }

  return days;
}

export function formatBakeDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(karachiNoon(iso));
}

export function isUpcomingBakeDay(iso: string): boolean {
  return upcomingBakeDays(12).some((day) => day.iso === iso);
}
