(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    Object.assign(root, factory());
  }
}(typeof self !== 'undefined' ? self : this, function () {
  function getLensRefractiveIndex(material) {
    const indices = {
      glass: 1.7,
      silicon: 2.5,
      germanium: 4.0
    };
    return indices[material] || 1.7;
  }

  function getLensMaterialDisplayName(material) {
    const names = {
      glass: 'Glass (n=1.7)',
      silicon: 'Silicon (n=2.5)',
      germanium: 'Germanium (n=4.0)'
    };
    return names[material] || 'Glass (n=1.7)';
  }

  function getHandicapHeight(handicap) {
    const baseHeight = 96;
    const heights = {
      small: Math.floor(baseHeight * 0.7),
      standard: baseHeight,
      large: Math.floor(baseHeight * 1.3),
      extra_large: Math.floor(baseHeight * 1.6)
    };
    return heights[handicap] || baseHeight;
  }

  function getHandicapDisplayName(handicap) {
    const names = {
      small: 'Small',
      standard: 'Standard',
      large: 'Large',
      extra_large: 'Extra Large'
    };
    return names[handicap] || 'Standard';
  }

  return {
    getLensRefractiveIndex,
    getLensMaterialDisplayName,
    getHandicapHeight,
    getHandicapDisplayName
  };
}));
