import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type CurrencyInfo = {
  code: string;
  symbol: string;
  name: string;
  locale: string;
};

// Country code → currency. Detection order:
//   1. IP geolocation (customer's real location)
//   2. Browser locale (e.g. en-IN, ja-JP)
//   3. Timezone (e.g. Asia/Kolkata)
//   4. USD fallback
const COUNTRY_CURRENCY: Record<string, CurrencyInfo> = {
  // Americas
  US: { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  CA: { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  MX: { code: "MXN", symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
  BR: { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  AR: { code: "ARS", symbol: "AR$", name: "Argentine Peso", locale: "es-AR" },
  CL: { code: "CLP", symbol: "CL$", name: "Chilean Peso", locale: "es-CL" },
  CO: { code: "COP", symbol: "COL$", name: "Colombian Peso", locale: "es-CO" },
  PE: { code: "PEN", symbol: "S/", name: "Peruvian Sol", locale: "es-PE" },
  // Europe
  GB: { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  DE: { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  FR: { code: "EUR", symbol: "€", name: "Euro", locale: "fr-FR" },
  NL: { code: "EUR", symbol: "€", name: "Euro", locale: "nl-NL" },
  BE: { code: "EUR", symbol: "€", name: "Euro", locale: "nl-BE" },
  ES: { code: "EUR", symbol: "€", name: "Euro", locale: "es-ES" },
  IT: { code: "EUR", symbol: "€", name: "Euro", locale: "it-IT" },
  PT: { code: "EUR", symbol: "€", name: "Euro", locale: "pt-PT" },
  AT: { code: "EUR", symbol: "€", name: "Euro", locale: "de-AT" },
  IE: { code: "EUR", symbol: "€", name: "Euro", locale: "en-IE" },
  FI: { code: "EUR", symbol: "€", name: "Euro", locale: "fi-FI" },
  GR: { code: "EUR", symbol: "€", name: "Euro", locale: "el-GR" },
  SK: { code: "EUR", symbol: "€", name: "Euro", locale: "sk-SK" },
  SI: { code: "EUR", symbol: "€", name: "Euro", locale: "sl-SI" },
  EE: { code: "EUR", symbol: "€", name: "Euro", locale: "et-EE" },
  LV: { code: "EUR", symbol: "€", name: "Euro", locale: "lv-LV" },
  LT: { code: "EUR", symbol: "€", name: "Euro", locale: "lt-LT" },
  LU: { code: "EUR", symbol: "€", name: "Euro", locale: "lb-LU" },
  HR: { code: "EUR", symbol: "€", name: "Euro", locale: "hr-HR" },
  CY: { code: "EUR", symbol: "€", name: "Euro", locale: "el-CY" },
  MT: { code: "EUR", symbol: "€", name: "Euro", locale: "mt-MT" },
  CH: { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-CH" },
  SE: { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE" },
  NO: { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "nb-NO" },
  DK: { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK" },
  PL: { code: "PLN", symbol: "zł", name: "Polish Złoty", locale: "pl-PL" },
  CZ: { code: "CZK", symbol: "Kč", name: "Czech Koruna", locale: "cs-CZ" },
  HU: { code: "HUF", symbol: "Ft", name: "Hungarian Forint", locale: "hu-HU" },
  RO: { code: "RON", symbol: "lei", name: "Romanian Leu", locale: "ro-RO" },
  RU: { code: "RUB", symbol: "₽", name: "Russian Ruble", locale: "ru-RU" },
  TR: { code: "TRY", symbol: "₺", name: "Turkish Lira", locale: "tr-TR" },
  UA: { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia", locale: "uk-UA" },
  // Asia-Pacific
  IN: { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  JP: { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  KR: { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR" },
  CN: { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
  HK: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "zh-HK" },
  TW: { code: "TWD", symbol: "NT$", name: "Taiwan Dollar", locale: "zh-TW" },
  SG: { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  MY: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", locale: "ms-MY" },
  TH: { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH" },
  ID: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID" },
  PH: { code: "PHP", symbol: "₱", name: "Philippine Peso", locale: "en-PH" },
  VN: { code: "VND", symbol: "₫", name: "Vietnamese Dong", locale: "vi-VN" },
  AU: { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  NZ: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
  PK: { code: "PKR", symbol: "Rs", name: "Pakistani Rupee", locale: "en-PK" },
  BD: { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", locale: "bn-BD" },
  LK: { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee", locale: "si-LK" },
  NP: { code: "NPR", symbol: "Rs", name: "Nepalese Rupee", locale: "ne-NP" },
  // Middle East
  AE: { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  SA: { code: "SAR", symbol: "﷼", name: "Saudi Riyal", locale: "ar-SA" },
  QA: { code: "QAR", symbol: "﷼", name: "Qatari Riyal", locale: "ar-QA" },
  KW: { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", locale: "ar-KW" },
  IL: { code: "ILS", symbol: "₪", name: "Israeli Shekel", locale: "he-IL" },
  // Africa
  ZA: { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
  EG: { code: "EGP", symbol: "E£", name: "Egyptian Pound", locale: "ar-EG" },
  NG: { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
  KE: { code: "KES", symbol: "KSh", name: "Kenyan Shilling", locale: "en-KE" },
  MA: { code: "MAD", symbol: "DH", name: "Moroccan Dirham", locale: "ar-MA" },
  GH: { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi", locale: "en-GH" },
};

const FALLBACK_CURRENCY: CurrencyInfo = {
  code: "USD",
  symbol: "$",
  name: "US Dollar",
  locale: "en-US",
};

// Static approximate rates (USD base) — the floor under the live API so a
// currency is never priced at the raw USD number just because the API
// doesn't cover it (e.g. frankfurter omits AED/SAR/PKR/RUB entirely).
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 84.5, JPY: 149.5, KRW: 1345,
  CNY: 7.25, AUD: 1.53, CAD: 1.36, CHF: 0.88, SEK: 10.5, NOK: 10.7,
  DKK: 6.85, PLN: 3.95, CZK: 23.2, HUF: 365, RON: 4.58, RUB: 92.5,
  TRY: 34.2, UAH: 41.5, HKD: 7.82, TWD: 31.8, SGD: 1.34, MYR: 4.72,
  THB: 35.8, IDR: 15650, PHP: 56.2, VND: 24500, NZD: 1.64,
  PKR: 278.5, BDT: 110, LKR: 312, NPR: 133.8, AED: 3.67, SAR: 3.75,
  QAR: 3.64, KWD: 0.307, ILS: 3.65, ZAR: 18.65, EGP: 48.3,
  NGN: 1550, KES: 153.5, MAD: 9.85, GHS: 15.5, BRL: 4.97,
  MXN: 17.15, ARS: 875, CLP: 885, COP: 3950, PEN: 3.75,
};

type CurrencyContextType = {
  currency: CurrencyInfo;
  formatPrice: (usdPrice: number) => string;
  loading: boolean;
  detectedFrom: string;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

// Timezone → country for the fallback path (no API needed).
function countryFromTimezone(tz: string): string | null {
  try {
    const parts = tz.split("/");
    const region = parts[0];
    // Unambiguous city → country shortcuts
    const CITY_COUNTRY: Record<string, string> = {
      Kolkata: "IN", Delhi: "IN", Calcutta: "IN",
      Tokyo: "JP", Seoul: "KR", Shanghai: "CN", Beijing: "CN",
      Hong_Kong: "HK", Taipei: "TW", Singapore: "SG",
      Kuala_Lumpur: "MY", Bangkok: "TH", Jakarta: "ID", Manila: "PH",
      Ho_Chi_Minh: "VN", Dubai: "AE", Riyadh: "SA", Doha: "QA", Kuwait: "KW",
      Tel_Aviv: "IL", Sydney: "AU", Melbourne: "AU", Brisbane: "AU", Perth: "AU",
      Auckland: "NZ", Toronto: "CA", Vancouver: "CA", Montreal: "CA",
      Sao_Paulo: "BR", Mexico_City: "MX", Buenos_Aires: "AR", Santiago: "CL",
      Bogota: "CO", Lima: "PE", Johannesburg: "ZA", Cairo: "EG", Lagos: "NG",
      Nairobi: "KE", Casablanca: "MA", Accra: "GH",
      London: "GB", Dublin: "IE", Paris: "FR", Berlin: "DE", Madrid: "ES",
      Rome: "IT", Amsterdam: "NL", Brussels: "BE", Vienna: "AT", Zurich: "CH",
      Stockholm: "SE", Oslo: "NO", Copenhagen: "DK", Warsaw: "PL", Prague: "CZ",
      Budapest: "HU", Bucharest: "RO", Moscow: "RU", Istanbul: "TR", Kyiv: "UA",
    };
    const city = parts[parts.length - 1];
    if (CITY_COUNTRY[city]) return CITY_COUNTRY[city];
    // Region-level default when the city is unknown
    const REGION_DEFAULT: Record<string, string> = {
      America: "US",
      Europe: "GB",
      Asia: "IN",
      Africa: "ZA",
      Australia: "AU",
      Pacific: "NZ",
      Atlantic: "PT",
    };
    return REGION_DEFAULT[region] ?? null;
  } catch {
    return null;
  }
}

// Browser locale (e.g. "en-IN", "ja-JP") → ISO country code.
function countryFromLocales(locales: readonly string[]): string | null {
  for (const l of locales) {
    const m = l.match(/-([A-Za-z]{2})\b/);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyInfo>(FALLBACK_CURRENCY);
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);
  const [detectedFrom, setDetectedFrom] = useState("default");

  useEffect(() => {
    let cancelled = false;

    const apply = (info: CurrencyInfo, from: string) => {
      if (cancelled) return;
      setCurrency(info);
      setDetectedFrom(from);
    };

    const detectCountryFromIp = async (): Promise<string | null> => {
      // Primary: country.is — purpose-built, fast, generous rate limits.
      try {
        const res = await fetch("https://api.country.is/", {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.country === "string") return data.country.toUpperCase();
        }
      } catch {
        // fall through to backup
      }
      // Backup: ipwho.is
      try {
        const res = await fetch("https://ipwho.is/", {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.country_code === "string") {
            return data.country_code.toUpperCase();
          }
        }
      } catch {
        // fall through to local signals
      }
      return null;
    };

    const run = async () => {
      // 1) IP geolocation = the customer's actual location.
      const ipCountry = await detectCountryFromIp();

      if (ipCountry) {
        apply(
          COUNTRY_CURRENCY[ipCountry] ?? FALLBACK_CURRENCY,
          `ip:${ipCountry}`,
        );
      } else {
        // 2) Browser locale (e.g. "en-IN" → IN)
        const locales =
          typeof navigator !== "undefined"
            ? navigator.languages ?? [navigator.language]
            : [];
        const localeCountry = countryFromLocales(locales);
        if (localeCountry && COUNTRY_CURRENCY[localeCountry]) {
          apply(COUNTRY_CURRENCY[localeCountry], `locale:${localeCountry}`);
        } else {
          // 3) Timezone fallback (e.g. "Asia/Kolkata" → IN)
          let tz = "";
          try {
            tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          } catch {
            tz = "";
          }
          const tzCountry = tz ? countryFromTimezone(tz) : null;
          if (tzCountry && COUNTRY_CURRENCY[tzCountry]) {
            apply(COUNTRY_CURRENCY[tzCountry], `tz:${tz}`);
          } else {
            apply(FALLBACK_CURRENCY, "default");
          }
        }
      }

      // Fetch live exchange rates (USD base). open.er-api.com covers 160+
      // currencies incl. AED/SAR/PKR that ECB-based APIs omit. Free, no key.
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD", {
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) throw new Error("rate fetch failed");
        const data = await res.json();
        if (data.rates && Object.keys(data.rates).length > 0) {
          // Live rates win; static fallbacks fill any gaps.
          if (!cancelled) setRates({ ...FALLBACK_RATES, ...data.rates, USD: 1 });
        }
      } catch {
        // Static fallback rates are already in place as the base.
      }
      if (!cancelled) setLoading(false);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatPrice = (usdPrice: number): string => {
    const rate = rates[currency.code] ?? 1;
    const raw = usdPrice * rate;
    // Whole-number pricing everywhere — no cents/paise decimals, ever.
    // Big converted amounts round to clean 10-steps (e.g. ₹6,590, ¥11,660).
    const converted =
      raw >= 1000 ? Math.round(raw / 10) * 10 : Math.round(raw);
    const digits = 0;
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(converted);
    } catch {
      return `${currency.symbol}${Math.round(converted).toLocaleString()}`;
    }
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, formatPrice, loading, detectedFrom }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
