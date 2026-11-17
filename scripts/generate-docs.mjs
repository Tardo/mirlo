// jsdoc no entiende Flow moderno: se quitan los tipos a una copia de src/ y se documenta esa copia.
import {cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {transformFileSync} from '@babel/core';

const work = mkdtempSync(join(tmpdir(), 'mirlo-api-'));
const src = join(work, 'src');
const out = join(work, 'out');

try {
  cpSync('src/js', src, {recursive: true});
  for (const entry of readdirSync(src, {recursive: true})) {
    if (!entry.endsWith('.mjs')) continue;
    const file = join(src, entry);
    const {code} = transformFileSync(file, {
      configFile: false,
      babelrc: false,
      sourceType: 'module',
      comments: true,
      presets: ['@babel/preset-flow'],
    });
    writeFileSync(file, code);
  }

  // Las rutas del config son relativas al propio config
  const conf = JSON.parse(readFileSync('jsdoc.json', 'utf8'));
  conf.source.include = [src, 'package.json', 'README.md'];
  conf.opts.tutorials = 'tutorials/';
  conf.opts.destination = out;
  const conf_path = join(work, 'jsdoc.json');
  writeFileSync(conf_path, JSON.stringify(conf));
  execFileSync('npx', ['jsdoc', '-c', conf_path], {stdio: 'inherit'});

  // jsdoc escribe en <out>/<paquete>/<versión>/; se publica en la raíz de docs/
  const [name] = readdirSync(out);
  const [version] = readdirSync(join(out, name));
  rmSync('docs', {recursive: true, force: true});
  cpSync(join(out, name, version), 'docs', {recursive: true});
  cpSync('mirlo.png', 'docs/mirlo.png');
} finally {
  rmSync(work, {recursive: true, force: true});
}
