/**
 * Format a number as Kenyan Shillings.
 * Example: formatKES(15000) → "KSh 15,000"
 */
export const formatKES = (amount: number | string): string => {
  const num = Number(amount);
  if (isNaN(num)) return "KSh 0";
  return `KSh ${num.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
};
