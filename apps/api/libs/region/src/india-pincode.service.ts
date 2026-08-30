import { Injectable, Logger } from '@nestjs/common';
import {
  INDIA_STATES,
  KNOWN_PIN_CODES,
  STATE_MAP,
  TIER_DELIVERY_CONFIG,
  type IndiaState,
  type PinCodeResult,
} from './india-pincode.data';

/**
 * IndiaPinCodeService — PIN Code Location Resolution for India
 *
 * Provides O(1) lookup for known PIN codes and O(n) range-scan fallback
 * for unknown PINs. Used by checkout, address forms, and delivery estimation.
 *
 * Similar to Amazon India / Flipkart's PIN code serviceability system.
 */
@Injectable()
export class IndiaPinCodeService {
  private readonly logger = new Logger(IndiaPinCodeService.name);

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Look up a 6-digit Indian PIN code and return full location details.
   * Returns null if PIN code is invalid or not found.
   */
  lookupPinCode(pin: string): PinCodeResult | null {
    if (!this.isValidPin(pin)) return null;

    // 1. Try O(1) exact lookup from known PIN map
    const known = KNOWN_PIN_CODES[pin];
    if (known) {
      const deliveryCfg = TIER_DELIVERY_CONFIG[known.tier];
      return {
        pinCode: pin,
        stateName: known.state,
        stateCode: known.stateCode,
        district: known.district,
        city: known.city,
        zone: this.getPinZone(pin),
        tier: known.tier,
        isUT: known.isUT,
        deliverable: deliveryCfg.deliverable,
        estimatedDeliveryDays: {
          standard: deliveryCfg.standard,
          express: deliveryCfg.express,
        },
      };
    }

    // 2. Fallback: range scan across all state/district configs
    const pinNum = parseInt(pin, 10);
    for (const state of INDIA_STATES) {
      for (const district of state.districts) {
        if (pinNum >= district.pinRangeStart && pinNum <= district.pinRangeEnd) {
          const tier = district.tier;
          const deliveryCfg = TIER_DELIVERY_CONFIG[tier];
          const city = district.majorCities[0] ?? district.name;
          this.logger.debug(`PIN ${pin} matched via range: ${state.name} / ${district.name}`);
          return {
            pinCode: pin,
            stateName: state.name,
            stateCode: state.code,
            district: district.name,
            city,
            zone: state.zone,
            tier,
            isUT: state.isUT,
            deliverable: deliveryCfg.deliverable,
            estimatedDeliveryDays: {
              standard: deliveryCfg.standard,
              express: deliveryCfg.express,
            },
          };
        }
      }
    }

    this.logger.warn(`PIN code ${pin} not found in India database`);
    return null;
  }

  /**
   * Check if KARTSEEK delivers to a given PIN code.
   * Tier 1 & 2 cities: always serviceable.
   * Tier 3: serviceable with extended timeline.
   * Unknown PIN: not serviceable.
   */
  checkDeliveryServiceability(pin: string): {
    pinCode: string;
    serviceable: boolean;
    reason: string;
    estimatedDeliveryDays?: { standard: number; express: number };
    location?: { city: string; district: string; state: string };
  } {
    if (!this.isValidPin(pin)) {
      return {
        pinCode: pin,
        serviceable: false,
        reason: 'Invalid PIN code. Indian PIN codes must be 6 digits.',
      };
    }

    const result = this.lookupPinCode(pin);
    if (!result) {
      return {
        pinCode: pin,
        serviceable: false,
        reason: 'This PIN code is not currently in our delivery network. We\'re expanding rapidly — check back soon!',
      };
    }

    const tierLabels: Record<1 | 2 | 3, string> = {
      1: 'Metro city — eligible for same-day and express delivery',
      2: 'Tier-2 city — eligible for standard and express delivery',
      3: 'Remote area — eligible for standard delivery (extended timeline)',
    };

    return {
      pinCode: pin,
      serviceable: result.deliverable,
      reason: result.deliverable ? tierLabels[result.tier] : 'Not currently serviceable',
      estimatedDeliveryDays: result.estimatedDeliveryDays,
      location: {
        city: result.city,
        district: result.district,
        state: result.stateName,
      },
    };
  }

  /**
   * Get all Indian states and Union Territories.
   */
  getStateList(): Array<{ code: string; name: string; capital: string; isUT: boolean; districtCount: number }> {
    return INDIA_STATES.map(s => ({
      code: s.code,
      name: s.name,
      capital: s.capital,
      isUT: s.isUT,
      districtCount: s.districts.length,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get districts for a specific state.
   */
  getDistrictsByState(stateCode: string): Array<{ name: string; pinRangeStart: number; pinRangeEnd: number; majorCities: string[]; tier: 1 | 2 | 3 }> {
    const state = STATE_MAP[stateCode.toUpperCase()];
    if (!state) return [];
    return state.districts;
  }

  /**
   * Get state info by state code.
   */
  getStateByCode(stateCode: string): IndiaState | undefined {
    return STATE_MAP[stateCode.toUpperCase()];
  }

  /**
   * Get summary statistics for admin dashboard.
   */
  getStats(): {
    totalStates: number;
    totalUTs: number;
    totalDistricts: number;
    totalKnownPins: number;
    tierBreakdown: Record<1 | 2 | 3, number>;
  } {
    const totalDistricts = INDIA_STATES.reduce((sum, s) => sum + s.districts.length, 0);
    const tierCounts: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
    for (const state of INDIA_STATES) {
      for (const d of state.districts) {
        tierCounts[d.tier]++;
      }
    }
    return {
      totalStates: INDIA_STATES.filter(s => !s.isUT).length,
      totalUTs: INDIA_STATES.filter(s => s.isUT).length,
      totalDistricts,
      totalKnownPins: Object.keys(KNOWN_PIN_CODES).length,
      tierBreakdown: tierCounts,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Validate that a PIN is exactly 6 digits and not a known invalid pattern */
  isValidPin(pin: string): boolean {
    if (!/^\d{6}$/.test(pin)) return false;
    if (pin === '000000' || pin === '111111' || pin === '999999') return false;
    return true;
  }

  /** Get postal zone number (1–9) from PIN code first digit */
  getPinZone(pin: string): string {
    const zones: Record<string, string> = {
      '1': 'Zone 1 (Delhi, Haryana, Punjab, HP, J&K)',
      '2': 'Zone 2 (Uttar Pradesh, Uttarakhand)',
      '3': 'Zone 3 (Rajasthan, Gujarat)',
      '4': 'Zone 4 (Maharashtra, Goa, MP)',
      '5': 'Zone 5 (AP, Telangana, Karnataka)',
      '6': 'Zone 6 (Tamil Nadu, Kerala, Puducherry)',
      '7': 'Zone 7 (West Bengal, NE States, Andaman)',
      '8': 'Zone 8 (Bihar, Jharkhand, Odisha, Chhattisgarh)',
      '9': 'Zone 9 (Military Post Offices)',
    };
    return zones[pin[0]] ?? 'Unknown Zone';
  }
}
