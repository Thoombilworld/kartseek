import { AttributeValuesService, type AttributeValueRow } from './attribute-values.service';
import type { ProductAttribute } from '../entities/product-attribute.entity';
import type { ProductAttributeValue } from '../entities/product-attribute-value.entity';

/**
 * The validation matrix from the product-page brief, verbatim: a seller must
 * not be able to store `RAM = "hello"`, `Battery = -5000 mAh`,
 * `Screen size = 999999 inch`, `Weight = -20 kg`, and every rule below is the
 * server's, not the form's.
 */
const def = (over: Partial<ProductAttribute>): ProductAttribute =>
  ({
    id: over.slug ?? 'id',
    name: over.name ?? over.slug ?? 'Attribute',
    slug: over.slug ?? 'attribute',
    type: 'TEXT',
    options: null as any,
    isVariantAxis: false,
    unit: null,
    isRequired: false,
    isFilterable: true,
    isSearchable: false,
    sortOrder: 0,
    categoryId: null,
    isActive: true,
    groupName: null,
    isHighlight: false,
    minValue: null,
    maxValue: null,
    ...over,
  }) as ProductAttribute;

const ram = def({
  slug: 'ram',
  name: 'RAM',
  type: 'NUMBER',
  unit: 'GB',
  minValue: '1',
  maxValue: '256',
});
const battery = def({
  slug: 'battery',
  name: 'Battery',
  type: 'NUMBER',
  unit: 'mAh',
  minValue: '100',
  maxValue: '20000',
});
const screen = def({
  slug: 'screen-size',
  name: 'Screen size',
  type: 'NUMBER',
  unit: 'inch',
  minValue: '1',
  maxValue: '120',
  groupName: 'Display',
  isHighlight: true,
});
const weight = def({ slug: 'weight', name: 'Weight', type: 'NUMBER', unit: 'kg', minValue: '0' });
const fiveG = def({ slug: '5g', name: '5G', type: 'BOOLEAN', isHighlight: true });
const os = def({
  slug: 'os',
  name: 'Operating system',
  type: 'select',
  options: [
    { label: 'iOS', value: 'ios' },
    { label: 'Android', value: 'android' },
  ],
  isRequired: true,
});
const ports = def({
  slug: 'ports',
  name: 'Ports',
  type: 'MULTI_SELECT',
  options: [
    { label: 'USB-C', value: 'usb-c' },
    { label: 'HDMI', value: 'hdmi' },
  ],
});
const colour = def({
  slug: 'colour',
  name: 'Colour',
  type: 'COLOR',
  isVariantAxis: true,
  isRequired: true,
  options: [{ label: 'Black', value: 'black', hex: '#000' }],
});
const processor = def({
  slug: 'processor',
  name: 'Processor',
  type: 'TEXT',
  isHighlight: true,
  groupName: 'Performance',
});
const released = def({ slug: 'released', name: 'Released', type: 'DATE' });
const tempRange = def({
  slug: 'temp',
  name: 'Operating temperature',
  type: 'RANGE',
  unit: '°C',
  minValue: '-40',
  maxValue: '85',
});

const DEFS = [
  ram,
  battery,
  screen,
  weight,
  fiveG,
  os,
  ports,
  colour,
  processor,
  released,
  tempRange,
];

const validate = (inputs: { slug: string; value: unknown }[], requireAll = false) =>
  AttributeValuesService.validate(DEFS, inputs, { requireAll });

describe('AttributeValuesService.validate', () => {
  it('normalises the type column, which is a free varchar', () => {
    expect(AttributeValuesService.normaliseType('text')).toBe('TEXT');
    expect(AttributeValuesService.normaliseType('multi-select')).toBe('MULTI_SELECT');
    expect(AttributeValuesService.normaliseType('Colour')).toBe('TEXT');
    expect(AttributeValuesService.normaliseType(undefined)).toBe('TEXT');
  });

  it('refuses the brief’s bad values with a message per attribute', () => {
    const { rows, errors } = validate([
      { slug: 'ram', value: 'hello' },
      { slug: 'battery', value: '-5000' },
      { slug: 'screen-size', value: 999999 },
      { slug: 'weight', value: -20 },
    ]);
    expect(rows).toEqual([]);
    expect(errors.map((e) => e.slug).sort()).toEqual(['battery', 'ram', 'screen-size', 'weight']);
    expect(errors.find((e) => e.slug === 'ram')?.message).toMatch(/must be a number GB/);
    expect(errors.find((e) => e.slug === 'battery')?.message).toMatch(/at least 100 mAh/);
    expect(errors.find((e) => e.slug === 'screen-size')?.message).toMatch(/at most 120 inch/);
    expect(errors.find((e) => e.slug === 'weight')?.message).toMatch(/at least 0 kg/);
  });

  it('stores a good number with four decimals, in the definition’s unit', () => {
    const { rows, errors } = validate([{ slug: 'screen-size', value: '6.1' }]);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        attributeId: 'screen-size',
        valueText: null,
        valueNumber: '6.1000',
        valueBool: null,
        valueJson: null,
      },
    ]);
  });

  it('accepts booleans in the forms a form or a CSV sends', () => {
    for (const [raw, expected] of [
      [true, true],
      ['yes', true],
      ['1', true],
      ['no', false],
      [false, false],
    ] as const) {
      const { rows, errors } = validate([{ slug: '5g', value: raw }]);
      expect(errors).toEqual([]);
      expect(rows[0].valueBool).toBe(expected);
    }
    expect(validate([{ slug: '5g', value: 'maybe' }]).errors[0].message).toMatch(/yes or no/);
  });

  it('maps a SELECT value to its canonical option, by value or label, case-insensitively', () => {
    expect(validate([{ slug: 'os', value: 'iOS' }]).rows[0].valueText).toBe('ios');
    expect(validate([{ slug: 'os', value: 'ANDROID' }]).rows[0].valueText).toBe('android');
    expect(validate([{ slug: 'os', value: 'windows' }]).errors[0].message).toMatch(
      /one of: iOS, Android/,
    );
  });

  it('dedupes and validates every MULTI_SELECT member', () => {
    expect(
      validate([{ slug: 'ports', value: ['USB-C', 'hdmi', 'usb-c'] }]).rows[0].valueJson,
    ).toEqual(['usb-c', 'hdmi']);
    expect(validate([{ slug: 'ports', value: 'usb-c, vga' }]).errors[0].message).toMatch(
      /must only contain/,
    );
    expect(validate([{ slug: 'ports', value: [] }]).errors[0].message).toMatch(/at least one/);
  });

  it('keeps text plain and bounded', () => {
    expect(validate([{ slug: 'processor', value: '  A17 Pro  ' }]).rows[0].valueText).toBe(
      'A17 Pro',
    );
    expect(
      validate([{ slug: 'processor', value: '<script>alert(1)</script>' }]).errors[0].message,
    ).toMatch(/HTML/);
    expect(validate([{ slug: 'processor', value: 'x'.repeat(501) }]).errors[0].message).toMatch(
      /500 characters/,
    );
    expect(validate([{ slug: 'processor', value: { nested: true } }]).errors[0].message).toMatch(
      /must be text/,
    );
  });

  it('validates dates and ranges', () => {
    expect(validate([{ slug: 'released', value: '2023-09-22' }]).rows[0].valueText).toBe(
      '2023-09-22',
    );
    expect(validate([{ slug: 'released', value: '22/09/2023' }]).errors[0].message).toMatch(
      /YYYY-MM-DD/,
    );
    expect(validate([{ slug: 'temp', value: { min: -10, max: 45 } }]).rows[0].valueJson).toEqual({
      min: -10,
      max: 45,
    });
    expect(validate([{ slug: 'temp', value: { min: 50, max: 10 } }]).errors[0].message).toMatch(
      /min must not exceed max/,
    );
    expect(validate([{ slug: 'temp', value: { min: -100, max: 10 } }]).errors[0].message).toMatch(
      /at least -40/,
    );
  });

  it('rejects attributes that are not in the category, empties and duplicates', () => {
    const { errors } = validate([
      { slug: 'ram', value: '' },
      { slug: 'wingspan', value: 3 },
      { slug: 'processor', value: 'A17' },
      { slug: 'processor', value: 'A16' },
    ]);
    expect(errors.map((e) => e.message)).toEqual([
      'RAM needs a value.',
      'wingspan is not an attribute of this category.',
      'Processor was submitted more than once.',
    ]);
  });

  it('enforces required attributes only when asked, and never for variant axes', () => {
    const lenient = validate([{ slug: 'ram', value: 8 }], false);
    expect(lenient.errors).toEqual([]);
    const strict = validate([{ slug: 'ram', value: 8 }], true);
    // `os` is required; `colour` is required too but is a variant axis — the
    // SKUs carry it, the product does not.
    expect(strict.errors).toEqual([{ slug: 'os', message: 'Operating system is required.' }]);
  });
});

describe('AttributeValuesService.present', () => {
  const value = (d: ProductAttribute, v: Partial<ProductAttributeValue>): AttributeValueRow =>
    AttributeValuesService.toRow(d, {
      valueText: null,
      valueNumber: null,
      valueBool: null,
      valueJson: null,
      ...v,
    } as ProductAttributeValue)!;

  it('renders each type as the page shows it, with units and option labels', () => {
    expect(value(screen, { valueNumber: '6.1000' }).displayValue).toBe('6.1 inch');
    expect(value(ram, { valueNumber: '8.0000' }).displayValue).toBe('8 GB');
    expect(value(fiveG, { valueBool: true }).displayValue).toBe('Yes');
    expect(value(os, { valueText: 'ios' }).displayValue).toBe('iOS');
    expect(value(ports, { valueJson: ['usb-c', 'hdmi'] }).displayValue).toBe('USB-C, HDMI');
    expect(value(tempRange, { valueJson: { min: -10, max: 45 } }).displayValue).toBe('-10–45 °C');
    expect(value(os, { valueText: 'ios' }).type).toBe('SELECT');
  });

  it('drops a row whose stored column does not match its type', () => {
    expect(AttributeValuesService.toRow(ram, { valueText: 'eight' } as any)).toBeNull();
    expect(AttributeValuesService.toRow(fiveG, { valueBool: null } as any)).toBeNull();
  });

  it('groups by the definition’s heading in first-seen order and derives highlights', () => {
    const rows = [
      value(processor, { valueText: 'A17 Pro' }),
      value(screen, { valueNumber: '6.1000' }),
      value(fiveG, { valueBool: true }),
      value(ram, { valueNumber: '8.0000' }),
    ];
    const out = AttributeValuesService.present(rows);
    expect(out.specificationGroups.map((g) => g.group)).toEqual([
      'Performance',
      'Display',
      'General',
    ]);
    expect(out.specificationGroups[2].attributes.map((a) => a.slug)).toEqual(['5g', 'ram']);
    // A true boolean is its name alone; the rest read "Name: value"; RAM is
    // not flagged and stays out.
    expect(out.highlights).toEqual(['Processor: A17 Pro', 'Screen size: 6.1 inch', '5G']);
  });

  it('never invents a highlight from a false boolean', () => {
    const out = AttributeValuesService.present([value(fiveG, { valueBool: false })]);
    expect(out.highlights).toEqual([]);
  });
});
