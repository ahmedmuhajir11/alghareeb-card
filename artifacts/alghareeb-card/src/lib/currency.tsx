import React, { createContext, useContext, useEffect, useState } from 'react';
import { useGetSettings } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth';

export type Currency = string;

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (priceUsd: number) => string;
  convertFromUsd: (priceUsd: number) => { amount: number; currency: Currency };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Map settings keys like "usdToTry" → { TRY: value }
function buildRateMap(settings: Record<string, unknown>): Record<string, number> {
  const map: Record<string, number> = { USD: 1 };
  for (const [key, val] of Object.entries(settings)) {
    if (key.startsWith('usdTo') && typeof val === 'number' && val > 0) {
      const code = key.slice(5).toUpperCase(); // "usdToTry" → "TRY"
      map[code] = val;
    }
  }
  return map;
}

// Decimal places per currency
const DECIMALS: Record<string, number> = {
  SYP: 0, IQD: 0, DZD: 0,
  OMR: 3, JOD: 3, KWD: 3,
};

function getDecimals(code: string): number {
  return DECIMALS[code.toUpperCase()] ?? 2;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [localCurrency, setLocalCurrency] = useState<Currency>(() => {
    return localStorage.getItem('currency') || 'USD';
  });

  const currency: Currency = user?.currency ? user.currency : localCurrency;

  const { data: settings } = useGetSettings();

  useEffect(() => {
    if (user?.currency) {
      setLocalCurrency(user.currency);
      localStorage.setItem('currency', user.currency);
    }
  }, [user?.currency]);

  const setCurrency = (c: Currency) => {
    setLocalCurrency(c);
    localStorage.setItem('currency', c);
  };

  const convertFromUsd = (priceUsd: number): { amount: number; currency: Currency } => {
    if (!settings) return { amount: priceUsd, currency: 'USD' };
    const rateMap = buildRateMap(settings as Record<string, unknown>);
    const rate = rateMap[currency.toUpperCase()] ?? null;
    if (!rate) return { amount: priceUsd, currency: 'USD' };
    return { amount: priceUsd * rate, currency };
  };

  const formatPrice = (priceUsd: number) => {
    if (!settings) return `${priceUsd.toFixed(2)} ${currency}`;
    const rateMap = buildRateMap(settings as Record<string, unknown>);
    const code = currency.toUpperCase();
    const rate = rateMap[code] ?? null;
    if (!rate) return `${priceUsd.toFixed(2)} USD`;
    const converted = priceUsd * rate;
    const decimals = getDecimals(code);
    const symbol = code === 'TRY' ? 'TL' : code;
    return `${converted.toFixed(decimals)} ${symbol}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, convertFromUsd }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
