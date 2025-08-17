const assert = require('assert');
const {
  getLensRefractiveIndex,
  getLensMaterialDisplayName,
  getHandicapHeight,
  getHandicapDisplayName
} = require('../beamer/utils.js');

// Refractive index tests
assert.strictEqual(getLensRefractiveIndex('glass'), 1.7);
assert.strictEqual(getLensRefractiveIndex('silicon'), 2.5);
assert.strictEqual(getLensRefractiveIndex('germanium'), 4.0);
assert.strictEqual(getLensRefractiveIndex('unknown'), 1.7);

// Material display names
assert.strictEqual(getLensMaterialDisplayName('silicon'), 'Silicon (n=2.5)');
assert.strictEqual(getLensMaterialDisplayName('plastic'), 'Glass (n=1.7)');

// Handicap heights
assert.strictEqual(getHandicapHeight('small'), Math.floor(96 * 0.7));
assert.strictEqual(getHandicapHeight('standard'), 96);
assert.strictEqual(getHandicapHeight('large'), Math.floor(96 * 1.3));
assert.strictEqual(getHandicapHeight('extra_large'), Math.floor(96 * 1.6));
assert.strictEqual(getHandicapHeight('unknown'), 96);

// Handicap display names
assert.strictEqual(getHandicapDisplayName('extra_large'), 'Extra Large');
assert.strictEqual(getHandicapDisplayName('unknown'), 'Standard');

console.log('All utility tests passed.');
