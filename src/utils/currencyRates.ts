/**
 * Currency Conversion Utility for Binder Auto-Quote Engine
 * 
 * Provides indicative FX rates for converting placement values into the binder's
 * rate table currency before performing band lookups. These are static mid-market
 * rates used solely for band selection — the actual premium calculation applies
 * the looked-up rate percentage to the original currency value, so small FX
 * discrepancies don't affect the final premium for percentage-based rates.
 * 
 * For flat-amount outputs (e.g., liability table flat premiums), the engine
 * converts the result back to the placement's currency using the inverse rate.
 * 
 * IMPORTANT: In production, these rates should be fetched from a live FX feed
 * or updated periodically. The rates below are indicative as of early 2026.
 */

/**
 * Exchange rates TO USD (i.e., 1 unit of currency = X USD).
 * To convert FROM a currency to USD: value * ratesToUSD[currency]
 * To convert TO a currency from USD: value / ratesToUSD[currency]
 */
const ratesToUSD: Record<string, number> = {
  USD: 1.0,
  GBP: 1.27,     // 1 GBP = 1.27 USD
  EUR: 1.09,     // 1 EUR = 1.09 USD
  CAD: 0.74,     // 1 CAD = 0.74 USD
  AUD: 0.65,     // 1 AUD = 0.65 USD
  CHF: 1.13,     // 1 CHF = 1.13 USD
  JPY: 0.0067,   // 1 JPY = 0.0067 USD
  SGD: 0.75,     // 1 SGD = 0.75 USD
  HKD: 0.13,     // 1 HKD = 0.13 USD
  NZD: 0.61,     // 1 NZD = 0.61 USD
  ZAR: 0.055,    // 1 ZAR = 0.055 USD
  AED: 0.27,     // 1 AED = 0.27 USD
  BRL: 0.17,     // 1 BRL = 0.17 USD
  SEK: 0.097,    // 1 SEK = 0.097 USD
  NOK: 0.094,    // 1 NOK = 0.094 USD
  DKK: 0.146,    // 1 DKK = 0.146 USD
  MXN: 0.058,    // 1 MXN = 0.058 USD
  INR: 0.012,    // 1 INR = 0.012 USD
  KRW: 0.00075,  // 1 KRW = 0.00075 USD
  THB: 0.029,    // 1 THB = 0.029 USD
  MYR: 0.22,     // 1 MYR = 0.22 USD
  PHP: 0.018,    // 1 PHP = 0.018 USD
  IDR: 0.000063, // 1 IDR = 0.000063 USD
  TWD: 0.031,    // 1 TWD = 0.031 USD
  PLN: 0.26,     // 1 PLN = 0.26 USD
  CZK: 0.044,    // 1 CZK = 0.044 USD
  HUF: 0.0028,   // 1 HUF = 0.0028 USD
  ILS: 0.28,     // 1 ILS = 0.28 USD
  TRY: 0.031,    // 1 TRY = 0.031 USD
  SAR: 0.27,     // 1 SAR = 0.27 USD
  QAR: 0.27,     // 1 QAR = 0.27 USD
  KWD: 3.26,     // 1 KWD = 3.26 USD
  BHD: 2.65,     // 1 BHD = 2.65 USD
  OMR: 2.60,     // 1 OMR = 2.60 USD
  CNY: 0.14,     // 1 CNY = 0.14 USD
};

/**
 * Convert an amount from one currency to another.
 * Returns the converted amount, or the original amount if either currency is unknown.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = ratesToUSD[fromCurrency.toUpperCase()];
  const toRate = ratesToUSD[toCurrency.toUpperCase()];
  
  if (!fromRate || !toRate) {
    // Unknown currency — return original amount and log warning
    console.warn(`[FX] Unknown currency in conversion: ${fromCurrency} → ${toCurrency}. Using 1:1 fallback.`);
    return amount;
  }
  
  // Convert: fromCurrency → USD → toCurrency
  const usdAmount = amount * fromRate;
  return usdAmount / toRate;
}

/**
 * Get the exchange rate from one currency to another.
 * Returns the multiplier: amount_in_from × rate = amount_in_to
 */
export function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return 1;
  
  const fromRate = ratesToUSD[fromCurrency.toUpperCase()];
  const toRate = ratesToUSD[toCurrency.toUpperCase()];
  
  if (!fromRate || !toRate) return 1;
  
  return fromRate / toRate;
}

/**
 * Check if a currency code is supported (has an FX rate defined).
 */
export function isSupportedCurrency(currency: string): boolean {
  return currency.toUpperCase() in ratesToUSD;
}

/**
 * Get all supported currency codes.
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(ratesToUSD);
}

/**
 * Format a conversion note for display in quote terms.
 * e.g., "GBP 500,000 → USD 635,000 (indicative rate: 1 GBP = 1.27 USD)"
 */
export function formatConversionNote(
  originalAmount: number,
  fromCurrency: string,
  toCurrency: string
): string {
  if (fromCurrency === toCurrency) return "";
  const converted = convertCurrency(originalAmount, fromCurrency, toCurrency);
  const rate = getExchangeRate(fromCurrency, toCurrency);
  return `${fromCurrency} ${originalAmount.toLocaleString()} → ${toCurrency} ${Math.round(converted).toLocaleString()} (indicative: 1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency})`;
}
