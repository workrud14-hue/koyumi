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

// Map timezones to currencies
const TIMEZONE_CURRENCY_MAP: Record<string, CurrencyInfo> = {
  // India
  "Asia/Kolkata": { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  // USA
  "America/New_York": { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  "America/Chicago": { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  "America/Denver": { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  "America/Los_Angeles": { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  // UK
  "Europe/London": { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  // Europe
  "Europe/Berlin": { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  "Europe/Paris": { code: "EUR", symbol: "€", name: "Euro", locale: "fr-FR" },
  "Europe/Amsterdam": { code: "EUR", symbol: "€", name: "Euro", locale: "nl-NL" },
  "Europe/Madrid": { code: "EUR", symbol: "€", name: "Euro", locale: "es-ES" },
  "Europe/Rome": { code: "EUR", symbol: "€", name: "Euro", locale: "it-IT" },
  "Europe/Moscow": { code: "RUB", symbol: "₽", name: "Russian Ruble", locale: "ru-RU" },
  // Japan
  "Asia/Tokyo": { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  // South Korea
  "Asia/Seoul": { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR" },
  // China
  "Asia/Shanghai": { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
  "Asia/Hong_Kong": { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "zh-HK" },
  // Australia
  "Australia/Sydney": { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  "Australia/Melbourne": { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  // Canada
  "America/Toronto": { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  "America/Vancouver": { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  // Brazil
  "America/Sao_Paulo": { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  // Mexico
  "America/Mexico_City": { code: "MXN", symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
  // Singapore
  "Asia/Singapore": { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  // UAE / Dubai
  "Asia/Dubai": { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  // Saudi Arabia
  "Asia/Riyadh": { code: "SAR", symbol: "﷼", name: "Saudi Riyal", locale: "ar-SA" },
  // Pakistan
  "Asia/Karachi": { code: "PKR", symbol: "Rs", name: "Pakistani Rupee", locale: "en-PK" },
  // Bangladesh
  "Asia/Dhaka": { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", locale: "bn-BD" },
  // Thailand
  "Asia/Bangkok": { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH" },
  // Indonesia
  "Asia/Jakarta": { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", locale: "id-ID" },
  // Philippines
  "Asia/Manila": { code: "PHP", symbol: "₱", name: "Philippine Peso", locale: "en-PH" },
  // Malaysia
  "Asia/Kuala_Lumpur": { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", locale: "ms-MY" },
  // Taiwan
  "Asia/Taipei": { code: "TWD", symbol: "NT$", name: "Taiwan Dollar", locale: "zh-TW" },
  // Vietnam
  "Asia/Ho_Chi_Minh": { code: "VND", symbol: "₫", name: "Vietnamese Dong", locale: "vi-VN" },
  // Turkey
  "Europe/Istanbul": { code: "TRY", symbol: "₺", name: "Turkish Lira", locale: "tr-TR" },
  // Egypt
  "Africa/Cairo": { code: "EGP", symbol: "E£", name: "Egyptian Pound", locale: "ar-EG" },
  // Nigeria
  "Africa/Lagos": { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
  // South Africa
  "Africa/Johannesburg": { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
  // Kenya
  "Africa/Nairobi": { code: "KES", symbol: "KSh", name: "Kenyan Shilling", locale: "en-KE" },
  // Argentina
  "America/Argentina/Buenos_Aires": { code: "ARS", symbol: "AR$", name: "Argentine Peso", locale: "es-AR" },
  // Colombia
  "America/Bogota": { code: "COP", symbol: "COL$", name: "Colombian Peso", locale: "es-CO" },
  // Chile
  "America/Santiago": { code: "CLP", symbol: "CL$", name: "Chilean Peso", locale: "es-CL" },
  // New Zealand
  "Pacific/Auckland": { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
  // Sri Lanka
  "Asia/Colombo": { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee", locale: "si-LK" },
  // Nepal
  "Asia/Kathmandu": { code: "NPR", symbol: "Rs", name: "Nepalese Rupee", locale: "ne-NP" },
  // Qatar
  "Asia/Qatar": { code: "QAR", symbol: "﷼", name: "Qatari Riyal", locale: "ar-QA" },
  // Kuwait
  "Asia/Kuwait": { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", locale: "ar-KW" },
};

const FALLBACK_CURRENCY: CurrencyInfo = {
  code: "USD",
  symbol: "$",
  name: "US Dollar",
  locale: "en-US",
};

// All supported currencies with their exchange rates relative to USD
const SUPPORTED_CURRENCY_CODES = [
  "USD", "INR", "GBP", "EUR", "JPY", "KRW", "CNY", "AUD", "CAD",
  "BRL", "MXN", "SGD", "AED", "SAR", "PKR", "BDT", "THB", "IDR",
  "PHP", "MYR", "TWD", "VND", "TRY", "EGP", "NGN", "ZAR", "KES",
  "ARS", "COP", "CLP", "NZD", "LKR", "NPR", "QAR", "KWD", "HKD",
  "RUB",
];

type CurrencyContextType = {
  currency: CurrencyInfo;
  setCurrency: (c: CurrencyInfo) => void;
  formatPrice: (usdPrice: number) => string;
  convertPrice: (usdPrice: number) => number;
  allCurrencies: CurrencyInfo[];
  loading: boolean;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

function detectCurrency(): CurrencyInfo {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONE_CURRENCY_MAP[tz]) {
      return TIMEZONE_CURRENCY_MAP[tz];
    }
    // Try partial match (e.g., "America/Indiana/Indianapolis" → "America/...")
    const tzPrefix = tz.split("/").slice(0, 2).join("/");
    for (const [key, val] of Object.entries(TIMEZONE_CURRENCY_MAP)) {
      if (key.startsWith(tzPrefix)) return val;
    }
  } catch {
    // fallback
  }
  // Default to USD
  return FALLBACK_CURRENCY;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyInfo>(FALLBACK_CURRENCY);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [loading, setLoading] = useState(true);

  // Detect currency on mount
  useEffect(() => {
    const detected = detectCurrency();
    // Check localStorage for user override
    const saved = localStorage.getItem("kiyumi-currency");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.code) {
          setCurrencyState(parsed);
        } else {
          setCurrencyState(detected);
        }
      } catch {
        setCurrencyState(detected);
      }
    } else {
      setCurrencyState(detected);
    }
  }, []);

  // Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Use frankfurter.app (free, no API key needed)
        const codes = SUPPORTED_CURRENCY_CODES.filter((c) => c !== "USD").join(",");
        const res = await fetch(
          `https://api.frankfurter.app/latest?from=USD&to=${codes}`,
        );
        if (res.ok) {
          const data = await res.json();
          setRates({ USD: 1, ...data.rates });
        }
      } catch {
        // Use fallback static rates if API fails
        setRates({
          USD: 1,
          INR: 84.5,
          GBP: 0.79,
          EUR: 0.92,
          JPY: 149.5,
          KRW: 1345,
          CNY: 7.25,
          AUD: 1.53,
          CAD: 1.36,
          BRL: 4.97,
          MXN: 17.15,
          SGD: 1.34,
          AED: 3.67,
          SAR: 3.75,
          PKR: 278.5,
          BDT: 110,
          THB: 35.8,
          IDR: 15650,
          PHP: 56.2,
          MYR: 4.72,
          TWD: 31.8,
          VND: 24500,
          TRY: 34.2,
          EGP: 48.3,
          NGN: 1550,
          ZAR: 18.65,
          KES: 153.5,
          ARS: 875,
          COP: 3950,
          CLP: 885,
          NZD: 1.64,
          LKR: 312,
          NPR: 133.8,
          QAR: 3.64,
          KWD: 0.307,
          HKD: 7.82,
          RUB: 92.5,
        });
      }
      setLoading(false);
    };
    fetchRates();
  }, []);

  const setCurrency = (c: CurrencyInfo) => {
    setCurrencyState(c);
    localStorage.setItem("kiyumi-currency", JSON.stringify(c));
  };

  const convertPrice = (usdPrice: number): number => {
    const rate = rates[currency.code] ?? 1;
    return Math.round(usdPrice * rate);
  };

  const formatPrice = (usdPrice: number): string => {
    const converted = convertPrice(usdPrice);
    try {
      return new Intl.NumberFormat(currency.locale, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: currency.code === "JPY" || currency.code === "KRW" || currency.code === "IDR" || currency.code === "VND" || currency.code === "CLP" ? 0 : 0,
        maximumFractionDigits: currency.code === "JPY" || currency.code === "KRW" || currency.code === "IDR" || currency.code === "VND" || currency.code === "CLP" ? 0 : 2,
      }).format(converted);
    } catch {
      return `${currency.symbol}${converted.toLocaleString()}`;
    }
  };

  // All available currencies for the currency picker
  const allCurrencies: CurrencyInfo[] = [
    ...Object.values(TIMEZONE_CURRENCY_MAP).filter(
      (v, i, arr) => arr.findIndex((c) => c.code === v.code) === i,
    ),
  ].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, formatPrice, convertPrice, allCurrencies, loading }}
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
