import React, { createContext, useContext, useEffect, useState } from 'react';
import { useGetSettings } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth';

export type Currency = 'USD' | 'EUR' | 'TRY' | 'SYP' | 'OMR' | 'MAD' | 'DZD' | 'ILS' | 'IQD' | 'SAR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (priceUsd: number) => string;
  convertFromUsd: (priceUsd: number) => { amount: number; currency: Currency };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [localCurrency, setLocalCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('currency');
    return (saved as Currency) || 'USD';
  });

  // Always prefer logged-in user's currency over localStorage
  const currency: Currency = user?.currency ? (user.currency as Currency) : localCurrency;

  const { data: settings } = useGetSettings();

  useEffect(() => {
    if (user?.currency) {
      setLocalCurrency(user.currency as Currency);
      localStorage.setItem('currency', user.currency);
    }
  }, [user?.currency]);

  const setCurrency = (c: Currency) => {
    setLocalCurrency(c);
    localStorage.setItem('currency', c);
  };

  const convertFromUsd = (priceUsd: number): { amount: number; currency: Currency } => {
    if (!settings) return { amount: priceUsd, currency: 'USD' };
    const map: Record<Currency, number> = {
      USD: 1,
      EUR: settings.usdToEur,
      TRY: settings.usdToTry,
      SYP: settings.usdToSyp,
      OMR: settings.usdToOmr,
      MAD: settings.usdToMad,
      DZD: settings.usdToDzd,
      ILS: settings.usdToIls,
      IQD: settings.usdToIqd,
      SAR: settings.usdToSar,
    };
    return { amount: priceUsd * (map[currency] ?? 1), currency };
  };

  const formatPrice = (priceUsd: number) => {
    if (!settings) return `${priceUsd.toFixed(2)} USD`;
    
    let converted = priceUsd;
    let symbol = 'USD';
    let decimals = 2;

    switch (currency) {
      case 'EUR':
        converted = priceUsd * settings.usdToEur;
        symbol = 'EUR';
        break;
      case 'TRY':
        converted = priceUsd * settings.usdToTry;
        symbol = 'TL';
        decimals = 2;
        break;
      case 'SYP':
        converted = priceUsd * settings.usdToSyp;
        symbol = 'SYP';
        decimals = 0;
        break;
      case 'OMR':
        converted = priceUsd * settings.usdToOmr;
        symbol = 'OMR';
        decimals = 3;
        break;
      case 'MAD':
        converted = priceUsd * settings.usdToMad;
        symbol = 'MAD';
        decimals = 2;
        break;
      case 'DZD':
        converted = priceUsd * settings.usdToDzd;
        symbol = 'DZD';
        decimals = 0;
        break;
      case 'ILS':
        converted = priceUsd * settings.usdToIls;
        symbol = 'ILS';
        decimals = 2;
        break;
      case 'IQD':
        converted = priceUsd * settings.usdToIqd;
        symbol = 'IQD';
        decimals = 0;
        break;
      case 'SAR':
        converted = priceUsd * settings.usdToSar;
        symbol = 'SAR';
        decimals = 2;
        break;
      default:
        converted = priceUsd;
        symbol = 'USD';
        break;
    }

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
