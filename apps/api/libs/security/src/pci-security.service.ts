import { Injectable, Logger } from '@nestjs/common';

/**
 * PciSecurityService — Enterprise PCI-DSS Compliance Security Layer.
 *
 * Enforces security controls on payment cardholder data (CHD) and
 * sensitive authentication data (SAD) including:
 *  - Luhn Algorithm validation (Mod 10 verification)
 *  - PAN (Primary Account Number) masking (1st 6 & last 4 visible only)
 *  - SAD Redaction (CVV/CVC/PIN removal from logs, payloads, & exceptions)
 */
@Injectable()
export class PciSecurityService {
  private readonly logger = new Logger(PciSecurityService.name);

  /**
   * Validate a credit card number using the Luhn Algorithm (Mod 10).
   * Ensures the card number is structurally valid before routing to gateways.
   *
   * @param pan The Primary Account Number string
   * @returns boolean indicating validity
   */
  validateLuhn(pan: string): boolean {
    const sanitized = pan.replace(/\D/g, '');
    if (!sanitized || sanitized.length < 13 || sanitized.length > 19) {
      return false;
    }

    let sum = 0;
    let shouldDouble = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized.charAt(i), 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Mask a Primary Account Number (PAN).
   * Displays the first 6 digits and last 4 digits only. All other digits
   * are masked with 'X' characters to comply with PCI-DSS Requirement 3.3.
   *
   * @param pan The Primary Account Number
   * @returns masked PAN string
   */
  maskPan(pan: string): string {
    const sanitized = pan.replace(/\D/g, '');
    if (sanitized.length < 10) {
      return '************'; // Safe fallback
    }
    const first6 = sanitized.substring(0, 6);
    const last4 = sanitized.substring(sanitized.length - 4);
    const maskLength = sanitized.length - 10;
    const maskedMiddle = 'X'.repeat(maskLength);
    return `${first6}${maskedMiddle}${last4}`;
  }

  /**
   * Redact sensitive authentication data (SAD) and cardholder data (CHD) from payload.
   * Prevents writing plaintext PANs, CVVs, or PINs to logs or caching servers.
   *
   * @param data Any payload, log object, or request body
   * @returns redacted deep copy of the object
   */
  redactSensitiveData(data: any): any {
    if (!data) return data;
    
    if (typeof data !== 'object') {
      if (typeof data === 'string') {
        return this.redactCardPatterns(data);
      }
      return data;
    }

    const copy = Array.isArray(data) ? [...data] : { ...data };

    for (const key of Object.keys(copy)) {
      const value = copy[key];

      if (typeof value === 'object' && value !== null) {
        copy[key] = this.redactSensitiveData(value);
        continue;
      }

      if (typeof value === 'string') {
        const lowerKey = key.toLowerCase();

        // 1. Remove CVV/CVC (Sensitive Authentication Data - SAD must never be stored/logged)
        if (['cvv', 'cvc', 'cardcode', 'securitycode', 'security_code', 'cvv2'].includes(lowerKey)) {
          copy[key] = '[REDACTED_CVV]';
          continue;
        }

        // 2. Mask PAN/card number if the key matches typical names
        if (['cardnumber', 'pan', 'cc', 'creditcard', 'card_number', 'credit_card'].includes(lowerKey)) {
          copy[key] = this.maskPan(value);
          continue;
        }

        // 3. Remove card PINs
        if (['pin', 'cardpin', 'card_pin'].includes(lowerKey)) {
          copy[key] = '[REDACTED_PIN]';
          continue;
        }

        // 4. Scan generic string content for Credit Card number regex matches
        copy[key] = this.redactCardPatterns(value);
      }
    }

    return copy;
  }

  /**
   * Helper to scan string content for Credit Card patterns and mask them.
   */
  private redactCardPatterns(text: string): string {
    // Standard Regex matching Visa, Mastercard, Amex, Discover, JCB, Diners
    const ccRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/g;
    if (ccRegex.test(text)) {
      return text.replace(ccRegex, (match) => this.maskPan(match));
    }
    return text;
  }
}
