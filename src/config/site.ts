/**
 * instagramUrl: paste the Cinora profile URL. "#" keeps the button visible
 * without linking to an invented account.
 */
export const site = {
  name: "Cinora",
  city: "Sheikhupura",
  instagramUrl: "#",
  payment: {
    method: "Meezan Bank",
    accountTitle: "Anaya Fatima",
    accountNumber: "4040 4040 4040 4040",
    iban: "PKie893394udhxshgdajwyte",
    note: "Pre-orders only. The order is confirmed when payment is received.",
  },
} as const;

export function isRealLink(url: string): boolean {
  return /^https?:\/\/.+/i.test(url.trim());
}

export function hasPaymentDetails(): boolean {
  return Boolean(site.payment.method.trim() && site.payment.accountNumber.trim());
}
