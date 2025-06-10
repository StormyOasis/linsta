export default {
  plugins: [
    {
      name: 'removeAttrs',
      params: {
        attrs: ['[sketch\\:*]']  // Remove all sketch:* attributes
      }
    },
    {
      name: 'cleanupIds'
    },
    {
      name: 'removeXMLNS'
    }
  ]
};
