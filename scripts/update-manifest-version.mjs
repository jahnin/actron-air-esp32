import fs from 'node:fs';

const version = process.argv[2];

const manifestPath = 'custom_components/actron_air_esphome/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = version;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const packagePath = 'package.json';
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.version = version;
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

const constPath = 'src/const.ts';
const constContents = fs.readFileSync(constPath, 'utf8');
fs.writeFileSync(constPath, constContents.replace(/CARD_VERSION\s*=\s*'[^']*'/, `CARD_VERSION = '${version}'`));
