function key(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export const VINTED_BRANDS = Object.freeze({
  'adidas': { id: 14, slug: 'adidas' },
  'bershka': { id: 140, slug: 'bershka' },
  'burberry': { id: 364, slug: 'burberry' },
  'calvin klein': { id: 255, slug: 'calvin-klein' },
  'carhartt': { id: 362, slug: 'carhartt' },
  'carhartt wip': { id: 872289, slug: 'carhartt-wip' },
  'dickies': { id: 65, slug: 'dickies' },
  'fred perry': { id: 2929, slug: 'fred-perry' },
  'lacoste': { id: 304, slug: 'lacoste' },
  'levis': { id: 10, slug: 'levis' },
  'levi s': { id: 10, slug: 'levis' },
  'nike': { id: 53, slug: 'nike' },
  'ovs': { id: 7651, slug: 'ovs' },
  'polo ralph lauren': { id: 4273, slug: 'polo-ralph-lauren' },
  'ralph lauren': { id: 88, slug: 'ralph-lauren' },
  'tommy hilfiger': { id: 94, slug: 'tommy-hilfiger' },
  'vans': { id: 139, slug: 'vans' },
});

export const VINTED_CONDITIONS = Object.freeze({
  'nuovo con cartellino': 6,
  'nuova con cartellino': 6,
  'nuovo senza cartellino': 1,
  'nuova senza cartellino': 1,
  'come nuovo': 1,
  'come nuova': 1,
  'ottime': 2,
  'ottimo': 2,
  'ottima': 2,
  'molto buone': 2,
  'molto buono': 2,
  'buone': 3,
  'buono': 3,
  'buona': 3,
  'discrete': 4,
  'discreto': 4,
  'discreta': 4,
  'soddisfacenti': 4,
});

export const VINTED_COLORS = Object.freeze({
  'nero': 1,
  'nera': 1,
  'grigio': 3,
  'grigia': 3,
  'bianco': 5,
  'bianca': 5,
  'avorio': 5,
  'crema': 5,
  'beige': 7,
  'rosa': 9,
  'fucsia': 9,
  'viola': 11,
  'lilla': 11,
  'rosso': 12,
  'rossa': 12,
  'bordeaux': 12,
  'giallo': 13,
  'gialla': 13,
  'blu': 14,
  'blu navy': 14,
  'navy': 14,
  'azzurro': 14,
  'azzurra': 14,
  'verde': 16,
  'arancione': 17,
  'marrone': 19,
  'multicolore': 30,
  'multicolor': 30,
});

export const VINTED_SIZES = Object.freeze({
  women: Object.freeze({ xxs: 1394, xs: 1395, s: 1396, m: 1397, l: 1398, xl: 1399, xxl: 1400 }),
  men: Object.freeze({ xxs: 206, xs: 206, s: 207, m: 208, l: 209, xl: 210, xxl: 211 }),
});

const CATEGORY_RULES = Object.freeze([
  { aliases: ['blusa', 'bluse', 'camicetta', 'camicette'], women: { id: 1043, slug: 'bluse', label: 'Bluse' } },
  { aliases: ['polo'], women: { id: 1536, slug: 'polo', label: 'Polo' }, men: { id: 5492, slug: 'polo', label: 'Polo' } },
  { aliases: ['t shirt', 'tshirt', 'maglietta', 'magliette'], women: { id: 221, slug: 't-shirt', label: 'T-shirt' }, men: { id: 77, slug: 't-shirt', label: 'T-shirt' } },
  { aliases: ['camicia', 'camicie'], women: { id: 222, slug: 'camicie', label: 'Camicie' }, men: { id: 222, slug: 'camicie', label: 'Camicie' } },
  { aliases: ['felpa', 'felpe', 'hoodie', 'sweatshirt'], women: { id: 267, slug: 'felpe-e-felpe-con-cappuccio', label: 'Felpe e felpe con cappuccio' }, men: { id: 267, slug: 'felpe-e-felpe-con-cappuccio', label: 'Felpe e felpe con cappuccio' } },
  { aliases: ['pantalone', 'pantaloni', 'trousers'], women: { id: 583, slug: 'pantaloni', label: 'Pantaloni' }, men: { id: 583, slug: 'pantaloni', label: 'Pantaloni' } },
  { aliases: ['pantaloncino', 'pantaloncini', 'shorts', 'bermuda'], women: { id: 205, slug: 'pantaloncini', label: 'Pantaloncini' }, men: { id: 272, slug: 'pantaloncini', label: 'Pantaloncini' } },
  { aliases: ['maglione', 'maglioni', 'pullover'], women: { id: 1668, slug: 'maglioni', label: 'Maglioni' }, men: { id: 1668, slug: 'maglioni', label: 'Maglioni' } },
  { aliases: ['piumino', 'piumini'], women: { id: 2614, slug: 'piumini', label: 'Piumini' }, men: { id: 2614, slug: 'piumini', label: 'Piumini' } },
]);

const GENDER_WORDS = Object.freeze({
  women: ['donna', 'donna s', 'women', 'woman', 'femme', 'damen', 'mujer', 'senhora'],
  men: ['uomo', 'uomo s', 'men', 'man', 'homme', 'herren', 'hombre', 'senhor'],
});

export function normalizeVintedKey(value) {
  return key(value);
}

export function resolveVintedBrand(value) {
  const normalized = key(value);
  return VINTED_BRANDS[normalized] || null;
}

export function inferVintedGender(text, override = '') {
  if (override === 'women' || override === 'men') return override;
  const normalized = ` ${key(text)} `;
  if (GENDER_WORDS.women.some((word) => normalized.includes(` ${word} `))) return 'women';
  if (GENDER_WORDS.men.some((word) => normalized.includes(` ${word} `))) return 'men';
  if (/\b(blusa|bluse|camicetta|camicette|abito|vestito|gonna)\b/.test(normalized)) return 'women';
  return '';
}

export function resolveVintedCategory(value, gender = '') {
  const normalized = key(value);
  const rule = CATEGORY_RULES.find((entry) => entry.aliases.some((alias) => normalized.includes(alias)));
  if (rule) return rule[gender] || rule.women || rule.men || null;
  if (gender === 'women') return { id: 4, slug: 'women-clothing', label: 'Abbigliamento donna', broad: true };
  if (gender === 'men') return { id: 2050, slug: 'men-clothing', label: 'Abbigliamento uomo', broad: true };
  return null;
}

export function resolveVintedSize(value, gender = '') {
  if (!VINTED_SIZES[gender]) return null;
  const normalized = key(value);
  const match = normalized.match(/(?:^|\s)(xxs|xs|s|m|l|xl|xxl)(?:\s|$)/);
  if (!match) return null;
  const size = match[1];
  const id = VINTED_SIZES[gender][size];
  return id ? { id, label: size.toUpperCase() } : null;
}

export function resolveVintedCondition(value) {
  const normalized = key(value);
  for (const [label, id] of Object.entries(VINTED_CONDITIONS)) {
    if (normalized.includes(label)) return { id, label: String(value || '').trim() };
  }
  return null;
}

export function resolveVintedColors(value) {
  const normalized = key(value);
  const matches = [];
  for (const [label, id] of Object.entries(VINTED_COLORS)) {
    if (new RegExp(`(?:^| )${label.replace(/ /g, '\\s+')}(?: |$)`).test(normalized)) {
      if (!matches.some((entry) => entry.id === id)) matches.push({ id, label });
    }
  }
  return matches;
}
