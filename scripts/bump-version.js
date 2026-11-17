#!/usr/bin/env node
// Bumps the app's user-facing version in version.json (read by app.config.js).
//
//   node scripts/bump-version.js          1.2.0 -> 1.2.1   (patch, the default)
//   node scripts/bump-version.js minor    1.2.1 -> 1.3.0
//   node scripts/bump-version.js major    1.3.0 -> 2.0.0
//   node scripts/bump-version.js 2.0.0    set an exact version
//
// The build NUMBER is separate and still handled by EAS (autoIncrement).
// Remember to commit version.json along with your other changes.

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'version.json');
const current = JSON.parse(fs.readFileSync(file, 'utf8')).version;

if (!/^\d+\.\d+\.\d+$/.test(current)) {
  console.error(`version.json has an invalid version "${current}" (expected x.y.z)`);
  process.exit(1);
}

const [major, minor, patch] = current.split('.').map(Number);
const arg = process.argv[2];
let next;

if (!arg || arg === 'patch') next = `${major}.${minor}.${patch + 1}`;
else if (arg === 'minor') next = `${major}.${minor + 1}.0`;
else if (arg === 'major') next = `${major + 1}.0.0`;
else if (/^\d+\.\d+\.\d+$/.test(arg)) next = arg;
else {
  console.error(`Unknown argument "${arg}". Use patch, minor, major, or an exact x.y.z version.`);
  process.exit(1);
}

fs.writeFileSync(file, JSON.stringify({ version: next }, null, 2) + '\n');
console.log(`Version: ${current} -> ${next}  (commit version.json with your changes)`);