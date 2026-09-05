import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RedisService } from '@app/redis';
import { JwtAuthGuard } from '@app/security';

/**
 * Region/currency/language reference data.
 *
 * This controller is **read-only and file-backed on purpose**. It previously
 * declared seven TypeORM entities (`localization_country`, `_currency`,
 * `_language`, `_tax_rule`, `_exchange_rate`, `_translation`,
 * `user_locale_preference`) and a set of admin upsert routes, but those
 * entities were never added to `DatabaseModule.registerPostgres([...])` in
 * `api-gateway.module.ts` and no matching table was ever created. The result was worse
 * than having nothing: every read swallowed `EntityMetadataNotFoundError` in an
 * empty `catch` and silently returned the arrays below anyway, while every
 * admin write 500'd with `No metadata for "LocalizationLanguage"`.
 *
 * The platform's real source of truth for region data is
 * `apps/web/src/lib/localization/` on the web side; keep the tables below in
 * step with `COUNTRIES` there. If this ever needs to become database-backed,
 * register the entities and add a migration first — do not reintroduce the
 * silent-fallback pattern.
 */
@ApiTags('🌍 Localization')
@Controller('localization')
export class LocalizationController {
  constructor(private readonly redis: RedisService) {}

  // ─── REFERENCE DATA ───────────────────────────────────────────────────────

  private readonly seedCountries = [
    { code: 'QA', name: 'Qatar', flag: '🇶🇦', defaultLanguage: 'en', defaultCurrency: 'QAR', timezone: 'Asia/Qatar', callingCode: '+974', defaultLat: 25.2854, defaultLng: 51.531, defaultCity: 'Doha', supportedLanguages: ['en','ar'], measurementSystem: 'metric', dateFormat: 'DD/MM/YYYY', timeFormat: 'hh:mm A' },
    { code: 'IN', name: 'India', flag: '🇮🇳', defaultLanguage: 'en', defaultCurrency: 'INR', timezone: 'Asia/Kolkata', callingCode: '+91', defaultLat: 28.6139, defaultLng: 77.209, defaultCity: 'New Delhi', supportedLanguages: ['en','hi','ta','ml'], measurementSystem: 'metric', dateFormat: 'DD/MM/YYYY', timeFormat: 'hh:mm A' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪', defaultLanguage: 'en', defaultCurrency: 'AED', timezone: 'Asia/Dubai', callingCode: '+971', defaultLat: 25.2048, defaultLng: 55.2708, defaultCity: 'Dubai', supportedLanguages: ['en','ar'], measurementSystem: 'metric', dateFormat: 'DD/MM/YYYY', timeFormat: 'hh:mm A' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', defaultLanguage: 'ar', defaultCurrency: 'SAR', timezone: 'Asia/Riyadh', callingCode: '+966', defaultLat: 24.7136, defaultLng: 46.6753, defaultCity: 'Riyadh', supportedLanguages: ['ar','en'], measurementSystem: 'metric', dateFormat: 'DD/MM/YYYY', timeFormat: 'hh:mm A' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭', defaultLanguage: 'en', defaultCurrency: 'BHD', timezone: 'Asia/Bahrain', callingCode: '+973', defaultLat: 26.0667, defaultLng: 50.5577, defaultCity: 'Manama', supportedLanguages: ['en','ar'], measurementSystem: 'metric', dateFormat: 'DD/MM/YYYY', timeFormat: 'hh:mm A' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼', defaultLanguage: 'ar', defaultCurrency: 'KWD', timezone: 'Asia/Kuwait', callingCode: '+965', defaultLat: 29.3759, defaultLng: 47.9774, defaultCity: 'Kuwait City', supportedLanguages: ['ar','en'], measurementSystem: 'metric', dateFormat: 'DD/MM/YYYY', timeFormat: 'hh:mm A' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲', defaultLanguage: 'ar', defaultCurrency: 'OMR', timezone: 'Asia/Muscat', callingCode: '+968', defaultLat: 23.5859, defaultLng: 58.4059, defaultCity: 'Muscat', supportedLanguages: ['ar','en'], measurementSystem: 'metric', dateFormat: 'DD/MM/YYYY', timeFormat: 'hh:mm A' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', defaultLanguage: 'en', defaultCurrency: 'GBP', timezone: 'Europe/London', callingCode: '+44', defaultLat: 51.5074, defaultLng: -0.1278, defaultCity: 'London', supportedLanguages: ['en'], measurementSystem: 'imperial', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm' },
    { code: 'US', name: 'United States', flag: '🇺🇸', defaultLanguage: 'en', defaultCurrency: 'USD', timezone: 'America/New_York', callingCode: '+1', defaultLat: 40.7128, defaultLng: -74.006, defaultCity: 'New York', supportedLanguages: ['en','es'], measurementSystem: 'imperial', dateFormat: 'MM/DD/YYYY', timeFormat: 'hh:mm A' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬', defaultLanguage: 'en', defaultCurrency: 'SGD', timezone: 'Asia/Singapore', callingCode: '+65', defaultLat: 1.3521, defaultLng: 103.8198, defaultCity: 'Singapore', supportedLanguages: ['en'], measurementSystem: 'metric', dateFormat: 'DD/MM/YYYY', timeFormat: 'hh:mm A' },
  ];

  private readonly seedCurrencies = [
    { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', symbolPosition: 'before', decimalPlaces: 2, exchangeRateToUsd: 0.2747 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', symbolPosition: 'before', decimalPlaces: 2, exchangeRateToUsd: 0.012 },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', symbolPosition: 'before', decimalPlaces: 2, exchangeRateToUsd: 0.2723 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', symbolPosition: 'before', decimalPlaces: 2, exchangeRateToUsd: 0.2667 },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: 'ب.د', symbolPosition: 'before', decimalPlaces: 3, exchangeRateToUsd: 2.6596 },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', symbolPosition: 'before', decimalPlaces: 3, exchangeRateToUsd: 3.26 },
    { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع.', symbolPosition: 'before', decimalPlaces: 3, exchangeRateToUsd: 2.5974 },
    { code: 'GBP', name: 'British Pound', symbol: '£', symbolPosition: 'before', decimalPlaces: 2, exchangeRateToUsd: 1.27 },
    { code: 'USD', name: 'US Dollar', symbol: '$', symbolPosition: 'before', decimalPlaces: 2, exchangeRateToUsd: 1.0 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', symbolPosition: 'before', decimalPlaces: 2, exchangeRateToUsd: 0.74 },

    { code: 'EUR', name: 'Euro', symbol: '€', symbolPosition: 'before', decimalPlaces: 2, exchangeRateToUsd: 1.09 },
  ];

  private readonly seedLanguages = [
    { code: 'en', name: 'English', nativeName: 'English', isRtl: false, flag: '🇬🇧' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRtl: true, flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isRtl: false, flag: '🇮🇳' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isRtl: false, flag: '🇮🇳' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', isRtl: false, flag: '🇮🇳' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', isRtl: false, flag: '🇪🇸' },

  ];

  private readonly seedTaxRules = [
    { countryCode: 'QA', taxName: 'No Tax', rate: 0, isInclusive: true },
    { countryCode: 'IN', taxName: 'GST', rate: 18, isInclusive: true },
    { countryCode: 'AE', taxName: 'VAT', rate: 5, isInclusive: true },
    { countryCode: 'SA', taxName: 'VAT', rate: 15, isInclusive: true },
    { countryCode: 'BH', taxName: 'VAT', rate: 10, isInclusive: true },
    { countryCode: 'KW', taxName: 'No Tax', rate: 0, isInclusive: true },
    { countryCode: 'OM', taxName: 'VAT', rate: 5, isInclusive: true },
    { countryCode: 'GB', taxName: 'VAT', rate: 20, isInclusive: true },
    { countryCode: 'US', taxName: 'Sales Tax', rate: 8.875, isInclusive: false },
    { countryCode: 'SG', taxName: 'GST', rate: 9, isInclusive: true },

  ];

  // ─── PUBLIC ENDPOINTS ─────────────────────────────────────────────────────

  @Get('detect')
  @ApiOperation({ summary: 'Auto-detect locale from IP/headers/coordinates' })
  async detectLocale(@Req() req: any) {
    const lat = parseFloat(req.headers['x-latitude'] || '0');
    const lng = parseFloat(req.headers['x-longitude'] || '0');
    const acceptLang = req.headers['accept-language'] || 'en';
    const regionHeader = req.headers['x-region-code'];

    // Priority: header > GPS > IP > default
    const coordCountry = this.resolveCountryFromCoords(lat, lng);
    const countryCode = regionHeader || coordCountry || 'QA';
    const country = this.seedCountries.find(c => c.code === countryCode) || this.seedCountries[0];
    const currency = this.seedCurrencies.find(c => c.code === country.defaultCurrency);
    const taxRule = this.seedTaxRules.find(t => t.countryCode === countryCode);

    // Detect language from Accept-Language header
    const browserLang = acceptLang.split(',')[0]?.split('-')[0] || 'en';
    const lang = (country.supportedLanguages || []).includes(browserLang) ? browserLang : country.defaultLanguage;
    const language = this.seedLanguages.find(l => l.code === lang);

    return {
      country: { code: country.code, name: country.name, flag: country.flag },
      currency: currency ? { code: currency.code, symbol: currency.symbol, name: currency.name, symbolPosition: currency.symbolPosition, decimalPlaces: currency.decimalPlaces } : null,
      language: language ? { code: language.code, name: language.name, nativeName: language.nativeName, isRtl: language.isRtl } : null,
      tax: taxRule ? { name: taxRule.taxName, rate: taxRule.rate, isInclusive: taxRule.isInclusive } : null,
      timezone: country.timezone,
      dateFormat: country.dateFormat,
      timeFormat: country.timeFormat,
      measurementSystem: country.measurementSystem,
      supportedLanguages: country.supportedLanguages,
      // Only claim 'gps' when the coordinates actually landed inside a served
      // market — coordinates outside every box fall through to the default
      // country, and reporting that as a GPS hit hid the miss from the caller.
      detectedVia: regionHeader ? 'header' : (coordCountry ? 'gps' : 'default'),
    };
  }

  @Get('config')
  @ApiOperation({ summary: 'Full locale configuration for a country' })
  async getConfig(@Query('country') countryCode?: string) {
    const code = countryCode?.toUpperCase() || 'QA';
    const cacheKey = `locale:config:${code}`;

    // Check Redis cache
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const country = this.seedCountries.find(c => c.code === code) || this.seedCountries[0];
    const currency = this.seedCurrencies.find(c => c.code === country.defaultCurrency);
    const taxRules = this.seedTaxRules.filter(t => t.countryCode === code);
    const languages = this.seedLanguages.filter(l => (country.supportedLanguages || []).includes(l.code));

    const config = { country, currency, taxRules, languages, allCurrencies: this.seedCurrencies };

    // Cache for 1 hour
    await this.redis.setJson(cacheKey, config, 3600);
    return config;
  }

  @Get('countries')
  @ApiOperation({ summary: 'List all supported countries' })
  async getCountries() {
    return this.seedCountries;
  }

  @Get('currencies')
  @ApiOperation({ summary: 'List all supported currencies' })
  async getCurrencies() {
    return this.seedCurrencies;
  }

  @Get('languages')
  @ApiOperation({ summary: 'List all supported languages' })
  async getLanguages() {
    return this.seedLanguages;
  }

  @Get('exchange-rates')
  @ApiOperation({ summary: 'Get current exchange rates' })
  async getExchangeRates() {
    return this.seedCurrencies.map(c => ({ currency: c.code, toUsd: c.exchangeRateToUsd }));
  }

  @Get('tax-rules/:countryCode')
  @ApiOperation({ summary: 'Get tax rules for a country' })
  async getTaxRules(@Param('countryCode') countryCode: string) {
    const code = countryCode.toUpperCase();
    return this.seedTaxRules.filter(t => t.countryCode === code);
  }

  // NOTE: `GET /localization/translations/:lang` used to live here. It read the
  // `localization_translation` table, which does not exist, so it returned `{}`
  // for every language in every environment. UI strings come from
  // `apps/web/src/i18n/locales/` — not from this service.

  // ─── USER PREFERENCE ──────────────────────────────────────────────────────

  /**
   * Persist the user's manual locale choice for 24h.
   *
   * Redis-only, and the response says so: there is no `user_locale_preference`
   * table, so the preference does not survive a cache eviction. The client
   * also holds it in the `kartseek_country` / `kartseek_language` cookies,
   * which is what actually drives rendering.
   */
  @Post('preference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Save user locale preference (cached 24h, not persisted)' })
  async savePreference(@Req() req: any, @Body() dto: {
    countryCode?: string; languageCode?: string; currencyCode?: string; timezone?: string;
  }) {
    const userId = req.user?.userId || 'GUEST';
    const pref = { userId, ...dto, detectionMode: 'manual' };

    await this.redis.setJson(`user:locale:${userId}`, pref, 86400);
    return { success: true, preference: pref, storage: 'cache', ttlSeconds: 86400 };
  }

  // ─── ADMIN ENDPOINTS (REMOVED) ────────────────────────────────────────────
  //
  // `POST admin/country`, `admin/currency`, `admin/language`,
  // `admin/translation` and `admin/exchange-rate` used to live here. All five
  // wrote to unregistered entities, so each returned
  //   500 INTERNAL_ERROR — No metadata for "LocalizationCountry" was found.
  // They were never callable, and the admin UI never called them. To edit a
  // market, change the tables above (and `apps/web/src/lib/localization/`),
  // then redeploy. Reintroduce write routes only alongside real tables.

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  /**
   * Bounding boxes, ordered smallest area first.
   *
   * Order is load-bearing: Saudi Arabia's box geographically contains Bahrain's
   * and Kuwait's and overlaps Oman's, so checking SA earlier — as this did —
   * resolved Manama and Kuwait City to `SA`. First match wins, so the small
   * boxes must come first.
   *
   * Values are copied from `apps/web/src/lib/localization/countries.ts`
   * (`COUNTRIES[x].bounds`), which is the platform's source of truth for region
   * geometry. Keep the two in step when a market is added.
   */
  private static readonly COUNTRY_BOUNDS: ReadonlyArray<{
    code: string; minLat: number; maxLat: number; minLng: number; maxLng: number;
  }> = [
    { code: 'SG', minLat: 1.15, maxLat: 1.48, minLng: 103.6, maxLng: 104.1 },
    { code: 'BH', minLat: 25.5, maxLat: 26.4, minLng: 50.3, maxLng: 50.9 },
    { code: 'QA', minLat: 24.4, maxLat: 26.2, minLng: 50.7, maxLng: 51.7 },
    { code: 'KW', minLat: 28.5, maxLat: 30.1, minLng: 46.5, maxLng: 48.5 },
    { code: 'AE', minLat: 22.6, maxLat: 26.1, minLng: 51.5, maxLng: 56.4 },
    { code: 'OM', minLat: 16.6, maxLat: 26.4, minLng: 52.0, maxLng: 59.9 },
    { code: 'GB', minLat: 49.9, maxLat: 60.9, minLng: -8.6, maxLng: 1.8 },
    { code: 'SA', minLat: 16.3, maxLat: 32.2, minLng: 34.5, maxLng: 55.7 },
    { code: 'IN', minLat: 6.5, maxLat: 37.1, minLng: 68.1, maxLng: 97.4 },
    { code: 'US', minLat: 24.5, maxLat: 49.4, minLng: -125.0, maxLng: -66.9 },
  ];

  /** Country whose bounds contain the point, or null when it is outside every served market. */
  private resolveCountryFromCoords(lat: number, lng: number): string | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat === 0 && lng === 0) return null;
    const hit = LocalizationController.COUNTRY_BOUNDS.find(
      (b) => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng,
    );
    return hit ? hit.code : null;
  }
}
