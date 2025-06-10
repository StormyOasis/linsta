// svgo.config.mjs
const UNIT_CONVERSION = {
  mm: 3.7795,
  cm: 37.795,
  in: 96,
  pt: 1.333,
  pc: 16,
  px: 1
};

function parseDimension(value) {
  const match = /^([\d.]+)([a-z]*)$/.exec(value);
  if (!match) return null;

  const number = parseFloat(match[1]);
  const unit = match[2].toLowerCase() || 'px';
  const factor = UNIT_CONVERSION[unit];

  return isNaN(number) || !factor ? null : number * factor;
}

export default {
  plugins: [
    {
      name: 'logSvg',
      type: 'visitor',
      fn: () => ({
        element: {
          enter: (node) => {
            if (node.name === 'svg') {
              console.log('🪵 Processing:', node.attributes);
            }
          }
        }
      })
    },
    {
      name: 'addViewBox',
      type: 'visitor',
      fn: () => ({
        element: {
          enter: (node) => {
            if (
              node.name === 'svg' &&
              !node.attributes.viewBox &&
              node.attributes.width &&
              node.attributes.height
            ) {
              const w = parseDimension(node.attributes.width);
              const h = parseDimension(node.attributes.height);
              if (w && h) {
                node.attributes.viewBox = `0 0 ${w} ${h}`;
                console.log(`✅ Added viewBox="0 0 ${w} ${h}"`);
              }
            }
          }
        }
      })
    },
    {
      name: 'removeDimensions',
      type: 'visitor',
      fn: () => ({
        element: {
          enter: (node) => {
            if (node.name === 'svg') {
              delete node.attributes.width;
              delete node.attributes.height;
            }
          }
        }
      })
    },
    'preset-default'
  ]
};
