/**
 * Indian GST (Goods & Services Tax) utilities.
 * Handles state codes, tax rate lookups, CGST/SGST vs IGST logic,
 * HSN code mapping, and amount-in-words conversion.
 */

// ─── Indian State / UT Codes (as per GST registration) ───────────────────────

export const INDIAN_STATES: Record<string, { name: string; code: string }> = {
  '01': { name: 'Jammu & Kashmir', code: '01' },
  '02': { name: 'Himachal Pradesh', code: '02' },
  '03': { name: 'Punjab', code: '03' },
  '04': { name: 'Chandigarh', code: '04' },
  '05': { name: 'Uttarakhand', code: '05' },
  '06': { name: 'Haryana', code: '06' },
  '07': { name: 'Delhi', code: '07' },
  '08': { name: 'Rajasthan', code: '08' },
  '09': { name: 'Uttar Pradesh', code: '09' },
  '10': { name: 'Bihar', code: '10' },
  '11': { name: 'Sikkim', code: '11' },
  '12': { name: 'Arunachal Pradesh', code: '12' },
  '13': { name: 'Nagaland', code: '13' },
  '14': { name: 'Manipur', code: '14' },
  '15': { name: 'Mizoram', code: '15' },
  '16': { name: 'Tripura', code: '16' },
  '17': { name: 'Meghalaya', code: '17' },
  '18': { name: 'Assam', code: '18' },
  '19': { name: 'West Bengal', code: '19' },
  '20': { name: 'Jharkhand', code: '20' },
  '21': { name: 'Odisha', code: '21' },
  '22': { name: 'Chhattisgarh', code: '22' },
  '23': { name: 'Madhya Pradesh', code: '23' },
  '24': { name: 'Gujarat', code: '24' },
  '26': { name: 'Dadra & Nagar Haveli and Daman & Diu', code: '26' },
  '27': { name: 'Maharashtra', code: '27' },
  '29': { name: 'Karnataka', code: '29' },
  '30': { name: 'Goa', code: '30' },
  '31': { name: 'Lakshadweep', code: '31' },
  '32': { name: 'Kerala', code: '32' },
  '33': { name: 'Tamil Nadu', code: '33' },
  '34': { name: 'Puducherry', code: '34' },
  '35': { name: 'Andaman & Nicobar Islands', code: '35' },
  '36': { name: 'Telangana', code: '36' },
  '37': { name: 'Andhra Pradesh', code: '37' },
  '38': { name: 'Ladakh', code: '38' },
};

/** Map state name (case-insensitive) → state code */
export function getStateCode(stateName: string): string {
  const lower = stateName.toLowerCase().trim();
  for (const [code, info] of Object.entries(INDIAN_STATES)) {
    if (info.name.toLowerCase() === lower) return code;
  }
  // Fuzzy match common abbreviations
  const abbrevMap: Record<string, string> = {
    'ap': '37', 'ts': '36', 'ka': '29', 'tn': '33', 'kl': '32',
    'mh': '27', 'gj': '24', 'rj': '08', 'up': '09', 'mp': '23',
    'dl': '07', 'hr': '06', 'pb': '03', 'wb': '19', 'br': '10',
    'jh': '20', 'od': '21', 'cg': '22', 'ga': '30', 'hp': '02',
    'uk': '05', 'sk': '11', 'as': '18', 'mn': '14', 'ml': '17',
    'mz': '15', 'tr': '16', 'ar': '12', 'nl': '13', 'jk': '01',
  };
  if (abbrevMap[lower]) return abbrevMap[lower];
  // Default Karnataka (Bangalore HQ)
  return '29';
}

export function getStateName(code: string): string {
  return INDIAN_STATES[code]?.name || 'Unknown';
}

// ─── HSN Code Mapping ────────────────────────────────────────────────────────

export interface HSNInfo {
  code: string;
  description: string;
  gstRate: number; // Total GST rate (e.g. 18 means 18%)
}

/** Common HSN codes for marketplace products */
const HSN_MAP: Record<string, HSNInfo> = {
  // Electronics — order matters: more specific keywords first
  'headphone': { code: '8518', description: 'Sound reproducing apparatus', gstRate: 18 },
  'earphone': { code: '8518', description: 'Sound reproducing apparatus', gstRate: 18 },
  'airpods': { code: '8518', description: 'Sound reproducing apparatus', gstRate: 18 },
  'speaker': { code: '8518', description: 'Sound reproducing apparatus', gstRate: 18 },
  'smartphone': { code: '8517', description: 'Telephone sets / Smartphones', gstRate: 18 },
  'iphone': { code: '8517', description: 'Telephone sets / Smartphones', gstRate: 18 },
  'mobile': { code: '8517', description: 'Telephone sets / Smartphones', gstRate: 18 },
  'phone': { code: '8517', description: 'Telephone sets / Smartphones', gstRate: 18 },
  'laptop': { code: '8471', description: 'Automatic data processing machines', gstRate: 18 },
  'computer': { code: '8471', description: 'Automatic data processing machines', gstRate: 18 },
  'tablet': { code: '8471', description: 'Automatic data processing machines', gstRate: 18 },
  'camera': { code: '9006', description: 'Photographic cameras', gstRate: 18 },
  'television': { code: '8528', description: 'Television receivers', gstRate: 18 },
  'tv': { code: '8528', description: 'Television receivers', gstRate: 18 },
  'watch': { code: '9102', description: 'Wrist watches', gstRate: 18 },
  'charger': { code: '8504', description: 'Electrical transformers/chargers', gstRate: 18 },
  'cable': { code: '8544', description: 'Insulated wire & cables', gstRate: 18 },
  // Clothing
  'shirt': { code: '6205', description: 'Men\'s shirts', gstRate: 12 },
  'trouser': { code: '6203', description: 'Men\'s suits & trousers', gstRate: 12 },
  'dress': { code: '6204', description: 'Women\'s suits & dresses', gstRate: 12 },
  'shoe': { code: '6403', description: 'Footwear', gstRate: 18 },
  'bag': { code: '4202', description: 'Trunks, suitcases, handbags', gstRate: 18 },
  // Groceries
  'rice': { code: '1006', description: 'Rice', gstRate: 5 },
  'wheat': { code: '1001', description: 'Wheat', gstRate: 5 },
  'oil': { code: '1515', description: 'Vegetable fats and oils', gstRate: 5 },
  'milk': { code: '0401', description: 'Milk and cream', gstRate: 0 },
  // Default
  'default': { code: '8543', description: 'Electrical machines & apparatus', gstRate: 18 },
};

/** Look up HSN info for a product by name (keyword matching) */
export function getHSNForProduct(productName: string): HSNInfo {
  const lower = productName.toLowerCase();
  for (const [keyword, info] of Object.entries(HSN_MAP)) {
    if (keyword !== 'default' && lower.includes(keyword)) return info;
  }
  return HSN_MAP['default'];
}

// ─── GST Calculation ─────────────────────────────────────────────────────────

export interface GSTBreakdown {
  /** Whether this is an intra-state (CGST+SGST) or inter-state (IGST) transaction */
  isInterState: boolean;
  /** Taxable value (price before GST) */
  taxableValue: number;
  /** Total GST rate */
  gstRate: number;
  /** CGST rate (half of gstRate, only for intra-state) */
  cgstRate: number;
  /** CGST amount */
  cgstAmount: number;
  /** SGST rate (half of gstRate, only for intra-state) */
  sgstRate: number;
  /** SGST amount */
  sgstAmount: number;
  /** IGST rate (full gstRate, only for inter-state) */
  igstRate: number;
  /** IGST amount */
  igstAmount: number;
  /** Total tax amount */
  totalTax: number;
  /** Total including tax */
  totalWithTax: number;
}

/**
 * Calculate GST breakdown for a line item.
 * In India, GST is inclusive in MRP. So for an item priced at ₹1,180 with 18% GST:
 *   Taxable Value = 1180 / 1.18 = ₹1,000
 *   GST = ₹180
 *
 * For intra-state: CGST = 9% (₹90), SGST = 9% (₹90)
 * For inter-state: IGST = 18% (₹180)
 */
export function calculateGST(
  priceInclGST: number,
  gstRate: number,
  sellerStateCode: string,
  buyerStateCode: string,
): GSTBreakdown {
  const isInterState = sellerStateCode !== buyerStateCode;
  const taxableValue = Math.round((priceInclGST / (1 + gstRate / 100)) * 100) / 100;
  const totalTax = Math.round((priceInclGST - taxableValue) * 100) / 100;

  if (isInterState) {
    return {
      isInterState: true,
      taxableValue,
      gstRate,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: gstRate,
      igstAmount: totalTax,
      totalTax,
      totalWithTax: priceInclGST,
    };
  } else {
    const halfRate = gstRate / 2;
    const halfTax = Math.round((totalTax / 2) * 100) / 100;
    const otherHalf = totalTax - halfTax; // Avoid rounding errors
    return {
      isInterState: false,
      taxableValue,
      gstRate,
      cgstRate: halfRate,
      cgstAmount: halfTax,
      sgstRate: halfRate,
      sgstAmount: otherHalf,
      igstRate: 0,
      igstAmount: 0,
      totalTax,
      totalWithTax: priceInclGST,
    };
  }
}

// ─── Amount in Words ─────────────────────────────────────────────────────────

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertChunk(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertChunk(n % 100) : '');
}

/** Convert amount to Indian number system words (Lakh/Crore) */
export function amountInWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = '';

  if (rupees >= 10000000) {
    result += convertChunk(Math.floor(rupees / 10000000)) + ' Crore ';
  }
  const afterCrore = rupees % 10000000;

  if (afterCrore >= 100000) {
    result += convertChunk(Math.floor(afterCrore / 100000)) + ' Lakh ';
  }
  const afterLakh = afterCrore % 100000;

  if (afterLakh >= 1000) {
    result += convertChunk(Math.floor(afterLakh / 1000)) + ' Thousand ';
  }
  const afterThousand = afterLakh % 1000;

  if (afterThousand > 0) {
    result += convertChunk(afterThousand);
  }

  result = result.trim() + ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertChunk(paise) + ' Paise';
  }

  return result + ' Only';
}

// ─── Invoice Number Generator ────────────────────────────────────────────────

export function generateInvoiceNumber(orderId: string): string {
  // Format: INV-StateCode-YYYYMMDD-OrderSuffix
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const suffix = orderId.replace(/[^0-9]/g, '').slice(-5) || '00001';
  return `INV-29-${dateStr}-${suffix}`;
}
