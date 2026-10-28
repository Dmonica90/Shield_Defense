// Builds the SCORM 2004 4th Edition package for Workday from `dist-scorm/`:
// copies the vendored driver and launcher unchanged, writes the manifest with
// the course title and every file of the SCO, and zips it with the manifest at
// the archive root. The ZIP goes to the repository root, next to `app/`. Run
// through `npm run package:scorm`, which builds first.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const drivers = join(root, 'scorm/2004-4th');
const out = join(root, 'dist-scorm');
const zipName = 'clip-shield-defense-scorm2004.zip';
const title = 'Clip Shield Defense: False Security — Data Loss Prevention (DLP)';
const zipPath = join(root, '..', zipName);

mkdirSync(join(out, 'core'), { recursive: true });
copyFileSync(join(drivers, 'core/scorm-driver.js'), join(out, 'core/scorm-driver.js'));
copyFileSync(join(drivers, 'launcher.html'), join(out, 'launcher.html'));

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [relative(out, path)];
  });
const content = files(join(out, 'scormcontent')).sort();

const template = readFileSync(join(drivers, 'imsmanifest.xml'), 'utf8');
const fileList = ['launcher.html', 'core/scorm-driver.js', ...content]
  .map((href) => `      <file href="${href}"/>`)
  .join('\n');
const manifest = template
  .replace('identifier="my-course-manifest"', 'identifier="clip-shield-defense"')
  .replace('<title>My Course Title</title>', `<title>${title}</title>`)
  .replace('<title>My SCO Title</title>', `<title>${title}</title>`)
  .replace(/      <file href="launcher\.html"\/>[\s\S]*?(?=\n    <\/resource>)/, `${fileList}\n`);
for (const check of ['clip-shield-defense', `<title>${title}</title>`, 'href="scormcontent/index.html"']) {
  if (!manifest.includes(check)) throw new Error(`Manifest template changed: missing ${check}`);
}
writeFileSync(join(out, 'imsmanifest.xml'), manifest);

rmSync(zipPath, { force: true });
execFileSync('zip', ['-r', '-X', '-D', '-q', zipPath, 'imsmanifest.xml', 'launcher.html', 'core', 'scormcontent'], {
  cwd: out,
});
console.log(`${zipPath}: ${content.length + 3} files`);
