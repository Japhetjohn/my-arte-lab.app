// Complete list of countries supported by HostFi
// Organized by region for easy reference

export const SUPPORTED_COUNTRIES = [
    // Africa
    { code: 'NG', name: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
    { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪' },
    { code: 'GH', name: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
    { code: 'ZA', name: 'South Africa', currency: 'ZAR', flag: '🇿🇦' },
    { code: 'TZ', name: 'Tanzania', currency: 'TZS', flag: '🇹🇿' },
    { code: 'UG', name: 'Uganda', currency: 'UGX', flag: '🇺🇬' },
    { code: 'ZM', name: 'Zambia', currency: 'ZMW', flag: '🇿🇲' },
    { code: 'RW', name: 'Rwanda', currency: 'RWF', flag: '🇷🇼' },
    { code: 'EG', name: 'Egypt', currency: 'EGP', flag: '🇪🇬' },
    { code: 'MA', name: 'Morocco', currency: 'MAD', flag: '🇲🇦' },
    { code: 'TN', name: 'Tunisia', currency: 'TND', flag: '🇹🇳' },
    { code: 'DZ', name: 'Algeria', currency: 'DZD', flag: '🇩🇿' },
    { code: 'ET', name: 'Ethiopia', currency: 'ETB', flag: '🇪🇹' },
    { code: 'SN', name: 'Senegal', currency: 'XOF', flag: '🇸🇳' },
    { code: 'CM', name: 'Cameroon', currency: 'XAF', flag: '🇨🇲' },

    // Europe
    { code: 'FR', name: 'France', currency: 'EUR', flag: '🇫🇷' },
    { code: 'DE', name: 'Germany', currency: 'EUR', flag: '🇩🇪' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
    { code: 'IT', name: 'Italy', currency: 'EUR', flag: '🇮🇹' },
    { code: 'ES', name: 'Spain', currency: 'EUR', flag: '🇪🇸' },
    { code: 'NL', name: 'Netherlands', currency: 'EUR', flag: '🇳🇱' },
    { code: 'BE', name: 'Belgium', currency: 'EUR', flag: '🇧🇪' },
    { code: 'CH', name: 'Switzerland', currency: 'CHF', flag: '🇨🇭' },
    { code: 'SE', name: 'Sweden', currency: 'SEK', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', currency: 'NOK', flag: '🇳🇴' },
    { code: 'DK', name: 'Denmark', currency: 'DKK', flag: '🇩🇰' },
    { code: 'PL', name: 'Poland', currency: 'PLN', flag: '🇵🇱' },
    { code: 'CZ', name: 'Czech Republic', currency: 'CZK', flag: '🇨🇿' },
    { code: 'HU', name: 'Hungary', currency: 'HUF', flag: '🇭🇺' },
    { code: 'RO', name: 'Romania', currency: 'RON', flag: '🇷🇴' },
    { code: 'BG', name: 'Bulgaria', currency: 'BGN', flag: '🇧🇬' },
    { code: 'HR', name: 'Croatia', currency: 'HRK', flag: '🇭🇷' },
    { code: 'RS', name: 'Serbia', currency: 'RSD', flag: '🇷🇸' },
    { code: 'UA', name: 'Ukraine', currency: 'UAH', flag: '🇺🇦' },
    { code: 'TR', name: 'Turkey', currency: 'TRY', flag: '🇹🇷' },
    { code: 'PT', name: 'Portugal', currency: 'EUR', flag: '🇵🇹' },
    { code: 'GR', name: 'Greece', currency: 'EUR', flag: '🇬🇷' },
    { code: 'AT', name: 'Austria', currency: 'EUR', flag: '🇦🇹' },
    { code: 'IE', name: 'Ireland', currency: 'EUR', flag: '🇮🇪' },
    { code: 'FI', name: 'Finland', currency: 'EUR', flag: '🇫🇮' },

    // Americas
    { code: 'US', name: 'United States', currency: 'USD', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', currency: 'CAD', flag: '🇨🇦' },
    { code: 'MX', name: 'Mexico', currency: 'MXN', flag: '🇲🇽' },
    { code: 'BR', name: 'Brazil', currency: 'BRL', flag: '🇧🇷' },
    { code: 'AR', name: 'Argentina', currency: 'ARS', flag: '🇦🇷' },
    { code: 'CL', name: 'Chile', currency: 'CLP', flag: '🇨🇱' },
    { code: 'CO', name: 'Colombia', currency: 'COP', flag: '🇨🇴' },
    { code: 'PE', name: 'Peru', currency: 'PEN', flag: '🇵🇪' },
    { code: 'VE', name: 'Venezuela', currency: 'VES', flag: '🇻🇪' },
    { code: 'EC', name: 'Ecuador', currency: 'USD', flag: '🇪🇨' },

    // Asia
    { code: 'JP', name: 'Japan', currency: 'JPY', flag: '🇯🇵' },
    { code: 'CN', name: 'China', currency: 'CNY', flag: '🇨🇳' },
    { code: 'IN', name: 'India', currency: 'INR', flag: '🇮🇳' },
    { code: 'KR', name: 'South Korea', currency: 'KRW', flag: '🇰🇷' },
    { code: 'SG', name: 'Singapore', currency: 'SGD', flag: '🇸🇬' },
    { code: 'HK', name: 'Hong Kong', currency: 'HKD', flag: '🇭🇰' },
    { code: 'MY', name: 'Malaysia', currency: 'MYR', flag: '🇲🇾' },
    { code: 'TH', name: 'Thailand', currency: 'THB', flag: '🇹🇭' },
    { code: 'VN', name: 'Vietnam', currency: 'VND', flag: '🇻🇳' },
    { code: 'PH', name: 'Philippines', currency: 'PHP', flag: '🇵🇭' },
    { code: 'ID', name: 'Indonesia', currency: 'IDR', flag: '🇮🇩' },
    { code: 'PK', name: 'Pakistan', currency: 'PKR', flag: '🇵🇰' },
    { code: 'BD', name: 'Bangladesh', currency: 'BDT', flag: '🇧🇩' },
    { code: 'AE', name: 'United Arab Emirates', currency: 'AED', flag: '🇦🇪' },
    { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', flag: '🇸🇦' },
    { code: 'QA', name: 'Qatar', currency: 'QAR', flag: '🇶🇦' },
    { code: 'KW', name: 'Kuwait', currency: 'KWD', flag: '🇰🇼' },
    { code: 'IL', name: 'Israel', currency: 'ILS', flag: '🇮🇱' },
    { code: 'TW', name: 'Taiwan', currency: 'TWD', flag: '🇹🇼' },

    // Oceania
    { code: 'AU', name: 'Australia', currency: 'AUD', flag: '🇦🇺' },
    { code: 'NZ', name: 'New Zealand', currency: 'NZD', flag: '🇳🇿' },
];

// Sorted alphabetically for dropdown
export const COUNTRIES_ALPHABETICAL = [...SUPPORTED_COUNTRIES].sort((a, b) =>
    a.name.localeCompare(b.name)
);

// Get country by code
export function getCountryByCode(code) {
    return SUPPORTED_COUNTRIES.find(c => c.code === code);
}

// Get currency for country
export function getCurrencyForCountry(countryCode) {
    const country = getCountryByCode(countryCode);
    return country ? country.currency : 'USD';
}
