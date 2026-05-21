import fs from 'fs';
import path from 'path';

async function generate() {
  const dataPath = process.argv[2];
  if (!dataPath) {
    console.error("Usage: node generate.mjs <data.json>");
    process.exit(1);
  }

  const dataRaw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(dataRaw);
  const templateName = data.template;

  if (!templateName) {
    console.error("Error: 'template' field not found in JSON data.");
    process.exit(1);
  }

  const appRoot = process.env.APP_ROOT || process.cwd();
  const outputPath = process.env.COMPOSITION_PATH || path.join(process.cwd(), 'index.html');
  const templatePath = 'file://' + path.join(appRoot, 'templates', templateName, 'template.mjs').replace(/\\/g, '/');
  const stylePath = path.join(appRoot, 'templates', templateName, 'style.css');
  
  let templateModule;
  try {
    templateModule = await import(templatePath);
  } catch (e) {
    console.error('Error loading template module:', e);
    process.exit(1);
  }

  let styleContent = '';
  if (fs.existsSync(stylePath)) {
    styleContent = fs.readFileSync(stylePath, 'utf-8');
  }

  const html = templateModule.default(data, styleContent);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log('Successfully generated ' + outputPath + ' using template: ' + templateName);
}

generate();
