import childProcess from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const CURRENT_DIR = path.resolve(process.cwd());
const TARGET_DIR = path.resolve(CURRENT_DIR, '..', 'office-bohemia');
// const TARGET_DIR = path.resolve(CURRENT_DIR, '..', 'teams-modular-packages');
// const TARGET_DIR = '/Users/olfedias/Downloads/ydlqgz';

const PROJECTS = [
  '@wd40-integrations-griffel',
  '@wd40-native-shaker',
  '@wd40-transform',
  '@wd40-webpack-factory',
];

export function sh(command, cwd, pipeOutputToResult = false) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const options = {
      cwd: cwd || process.cwd(),
      env: process.env,
      stdio: pipeOutputToResult ? 'pipe' : 'inherit',
      shell: true,
    };

    const child = childProcess.spawn(cmd, args, options);

    let stdoutData = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdoutData += data;
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdoutData);
      }

      reject(
        new Error(
          [`child process exited with code ${code}`, stdoutData].join('\n')
        )
      );
    });
  });
}

// ----

const ASSETS = {};

await sh('rm -rf dist', CURRENT_DIR);
await sh('yarn nx run-many --target=build --all', CURRENT_DIR);

const srcNativeDir = path.resolve(CURRENT_DIR, 'packages', 'native-shaker');
const distNativeDir = path.resolve(
  CURRENT_DIR,
  'dist',
  'packages',
  'native-shaker'
);

const filesToCopy = [
  'index.js',
  'package.json',
  'wd40-shaker.darwin-arm64.node',
  'wd40-shaker.node',
];

await fs.mkdir(distNativeDir, { recursive: true });

for (const file of filesToCopy) {
  await fs.cp(
    path.resolve(srcNativeDir, file),
    path.resolve(distNativeDir, file)
  );
}

for (const project of PROJECTS) {
  const subset = project.includes('integrations') ? 'integrations' : 'packages';
  const pkgDirname = project.replace(/^@wd40-/, '').replace(subset + '-', '');

  const pkgDir = path.resolve(CURRENT_DIR, 'dist', subset, pkgDirname);
  await sh('npm pack', pkgDir);

  const pkgJson = await fs.readFile(
    path.resolve(pkgDir, 'package.json'),
    'utf-8'
  );
  const pkgVersion = JSON.parse(pkgJson).version;

  const tarName =
    project.replace('/', '-').replace(/^@/, '') + '-' + pkgVersion + '.tgz';
  const tarPath = path.resolve(pkgDir, tarName);
  const tarExists = await fs
    .access(tarPath)
    .then(() => true)
    .catch(() => false);

  if (!tarExists) {
    throw new Error(
      `Tarball ${tarName} does not exist in the target directory`
    );
  }

  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const newTarName = tarName.replace('.tgz', `-${randomSuffix}.tgz`);
  const newPath = path.resolve(pkgDir, newTarName);

  await fs.rename(tarPath, newPath);
  ASSETS[project] = newPath;
}

console.log('Packages:', ASSETS);

// ----

const pkgJsonPath = path.resolve(TARGET_DIR, 'package.json');
const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'));

const ARTIFACTS_DIR = path.resolve(TARGET_DIR, 'artifacts');

await fs.rm(ARTIFACTS_DIR, { recursive: true, force: true });
await fs.mkdir(ARTIFACTS_DIR, { recursive: true });

pkgJson.dependencies = pkgJson.dependencies ?? {};
pkgJson.resolutions = pkgJson.resolutions ?? {};

for (const [pkg, tarName] of Object.entries(ASSETS)) {
  const filename = path.basename(tarName);
  const pkgName = pkg.replace(/@wd40-/, '@wd40/');

  pkgJson.dependencies[pkgName] = `file:./artifacts/${filename}`;
  pkgJson.resolutions[pkgName] = `file:./artifacts/${filename}`;
  await fs.cp(tarName, path.resolve(ARTIFACTS_DIR, filename));
}

await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2));

console.log('Updated package.json:', pkgJson.dependencies);
