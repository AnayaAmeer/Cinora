export function formatRs(amount: number): string {
  return `Rs ${new Intl.NumberFormat("en-PK").format(amount)}`;
}

export function isValidPkMobile(input: string): boolean {
  const compact = input.replace(/[\s-]/g, "");
  return /^(?:03\d{9}|\+923\d{9})$/.test(compact);
}
