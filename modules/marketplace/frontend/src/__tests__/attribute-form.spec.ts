/**
 * Category-driven attribute fields and their client-side validation — the
 * seller form's courtesy copy of the server's rules. These pin that a value
 * the server would refuse is refused here too, that variant axes never become
 * form fields, and that blank optional fields are omitted rather than sent
 * as empty strings.
 */
import {
  attributeFields,
  groupFields,
  validateAttributeValue,
  validateAttributeValues,
  serialiseAttributeValues,
  attributeValuesFromProduct,
  type AttributeField,
} from '@/lib/marketplace/attribute-form';
import { buildCategoryTree, findCategoryNode } from '@/lib/marketplace/category-tree';

const DEFINITIONS = [
  {
    id: 'a-colour',
    slug: 'colour',
    name: 'Colour',
    type: 'COLOR',
    isVariantAxis: true,
    isRequired: true,
    sortOrder: 0,
    options: [{ label: 'Black', value: 'black', hex: '#000' }],
  },
  {
    id: 'a-model',
    slug: 'model',
    name: 'Model',
    type: 'text',
    groupName: 'General',
    isRequired: true,
    sortOrder: 1,
  },
  {
    id: 'a-ram',
    slug: 'ram',
    name: 'RAM',
    type: 'NUMBER',
    groupName: 'Performance',
    unit: 'GB',
    isRequired: true,
    minValue: '1.0000',
    maxValue: '64.0000',
    sortOrder: 3,
    isHighlight: true,
  },
  {
    id: 'a-os',
    slug: 'operating-system',
    name: 'Operating system',
    type: 'SELECT',
    groupName: 'Performance',
    isRequired: true,
    sortOrder: 2,
    options: [
      { label: 'iOS', value: 'ios' },
      { label: 'Android', value: 'android' },
    ],
  },
  { id: 'a-5g', slug: '5g', name: '5G', type: 'BOOLEAN', groupName: 'Connectivity', sortOrder: 9 },
  {
    id: 'a-bands',
    slug: 'bands',
    name: 'Bands',
    type: 'MULTI_SELECT',
    groupName: 'Connectivity',
    sortOrder: 10,
    options: [
      { label: 'n78', value: 'n78' },
      { label: 'n28', value: 'n28' },
    ],
  },
  {
    id: 'a-launch',
    slug: 'launch-date',
    name: 'Launch date',
    type: 'DATE',
    groupName: 'General',
    sortOrder: 4,
  },
  {
    id: 'a-temp',
    slug: 'operating-temperature',
    name: 'Operating temperature',
    type: 'RANGE',
    unit: '°C',
    minValue: -40,
    maxValue: 85,
    sortOrder: 11,
  },
  { id: 'a-old', slug: 'retired', name: 'Retired', type: 'TEXT', isActive: false, sortOrder: 99 },
];

const byslug = (slug: string): AttributeField =>
  attributeFields(DEFINITIONS).find((f) => f.slug === slug)!;

describe('attributeFields', () => {
  it('turns definitions into ordered fields, dropping variant axes and inactive rows', () => {
    const fields = attributeFields(DEFINITIONS);
    expect(fields.map((f) => f.slug)).toEqual([
      'model',
      'operating-system',
      'ram',
      'launch-date',
      '5g',
      'bands',
      'operating-temperature',
    ]);
    expect(fields.find((f) => f.slug === 'model')?.type).toBe('TEXT');
    expect(byslug('ram')).toMatchObject({
      unit: 'GB',
      minValue: 1,
      maxValue: 64,
      isHighlight: true,
      group: 'Performance',
    });
  });

  it('groups fields under their headings in first-seen order', () => {
    expect(groupFields(attributeFields(DEFINITIONS)).map((g) => g.group)).toEqual([
      'General',
      'Performance',
      'Connectivity',
    ]);
  });
});

describe('validateAttributeValue', () => {
  it('refuses the values the brief lists as must-reject', () => {
    expect(validateAttributeValue(byslug('ram'), 'hello')).toMatch(/must be a number/);
    expect(validateAttributeValue(byslug('ram'), '999999')).toMatch(/at most 64 GB/);
    expect(validateAttributeValue(byslug('ram'), '-5')).toMatch(/at least 1 GB/);
    expect(validateAttributeValue(byslug('operating-system'), 'Symbian')).toMatch(/must be one of/);
    expect(validateAttributeValue(byslug('operating-temperature'), '85-40')).toMatch(
      /must not exceed/,
    );
    expect(validateAttributeValue(byslug('operating-temperature'), '-50-20')).toMatch(
      /start at -40/,
    );
    expect(validateAttributeValue(byslug('launch-date'), '31/12/2025')).toMatch(/YYYY-MM-DD/);
    expect(validateAttributeValue(byslug('bands'), ['n78', 'n1'])).toMatch(
      /n1 is not an allowed value/,
    );
  });

  it('accepts valid values, blank optional values, and option labels as well as values', () => {
    expect(validateAttributeValue(byslug('ram'), '8')).toBeNull();
    expect(validateAttributeValue(byslug('operating-system'), 'iOS')).toBeNull();
    expect(validateAttributeValue(byslug('operating-system'), 'android')).toBeNull();
    expect(validateAttributeValue(byslug('5g'), '')).toBeNull();
    expect(validateAttributeValue(byslug('5g'), true)).toBeNull();
    expect(validateAttributeValue(byslug('operating-temperature'), '-20 to 60')).toBeNull();
    expect(validateAttributeValue(byslug('launch-date'), '2025-09-19')).toBeNull();
  });

  it('requires what the definition requires', () => {
    expect(validateAttributeValue(byslug('model'), '')).toMatch(/required/);
    expect(
      validateAttributeValues(attributeFields(DEFINITIONS), {
        model: 'X',
        ram: '8',
        'operating-system': 'ios',
      }),
    ).toEqual({});
    expect(Object.keys(validateAttributeValues(attributeFields(DEFINITIONS), {}))).toEqual([
      'model',
      'operating-system',
      'ram',
    ]);
  });
});

describe('serialiseAttributeValues', () => {
  it('sends typed values and omits blanks', () => {
    const out = serialiseAttributeValues(attributeFields(DEFINITIONS), {
      model: ' iPhone 15 Pro ',
      ram: '8',
      'operating-system': 'ios',
      '5g': true,
      bands: ['n78'],
      'launch-date': '',
      retired: 'x',
    });
    expect(out).toEqual([
      { attributeId: 'a-model', slug: 'model', value: 'iPhone 15 Pro' },
      { attributeId: 'a-os', slug: 'operating-system', value: 'ios' },
      { attributeId: 'a-ram', slug: 'ram', value: 8 },
      { attributeId: 'a-5g', slug: '5g', value: true },
      { attributeId: 'a-bands', slug: 'bands', value: ['n78'] },
    ]);
  });

  it('round-trips stored values back into the form', () => {
    const values = attributeValuesFromProduct([
      { slug: 'ram', value: 8 },
      { slug: '5g', value: true },
      { slug: 'bands', value: ['n78', 'n28'] },
      { slug: 'model', value: null },
    ]);
    expect(values).toEqual({ ram: '8', '5g': true, bands: ['n78', 'n28'] });
  });
});

describe('buildCategoryTree', () => {
  it('nests subcategories under their parent by id or slug and sorts by name', () => {
    const tree = buildCategoryTree({
      data: [
        { id: 'c1', name: 'Mobiles & Tablets', slug: 'mobiles-tablets', parentId: null },
        { id: 'c3', name: 'Tablets', slug: 'tablets', parentId: 'c1' },
        { id: 'c2', name: 'Smartphones', slug: 'smartphones', parentSlug: 'mobiles-tablets' },
        { id: 'c9', name: 'Appliances', slug: 'appliances' },
        { id: 'c5', name: 'Orphan', slug: 'orphan', parentId: 'missing' },
      ],
    });
    expect(tree.map((c) => c.name)).toEqual(['Appliances', 'Mobiles & Tablets', 'Orphan']);
    expect(tree[1].children.map((c) => c.slug)).toEqual(['smartphones', 'tablets']);
    expect(findCategoryNode(tree, 'c2')?.name).toBe('Smartphones');
    expect(findCategoryNode(tree, 'nope')).toBeNull();
  });
});
