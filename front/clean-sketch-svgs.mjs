import fs from 'fs';
import path from 'path';

const dir = './assets/svgs';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

for (const file of files) {
  const fullPath = path.join(dir, file);
  let content = fs.readFileSync(fullPath, 'utf8');

  // 1. Remove namespaced attributes (e.g. inkscape:label="...")
  content = content.replace(/\s+(inkscape|sodipodi|sketch):[a-zA-Z0-9_\-]+="[^"]*"/g, '');

  // 2. Remove self-closing namespaced elements (e.g. <sodipodi:guide ... />)
  content = content.replace(/<\s*(inkscape|sodipodi|sketch):[a-zA-Z0-9_\-]+[^>]*\/>/g, '');

  // 3. Remove block namespaced elements (e.g. <sodipodi:namedview>...</sodipodi:namedview>)
  content = content.replace(/<\s*(inkscape|sodipodi|sketch):[a-zA-Z0-9_\-]+[^>]*>[\s\S]*?<\/\1:[a-zA-Z0-9_\-]+>/g, '');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Cleaned ${file}`);
}
