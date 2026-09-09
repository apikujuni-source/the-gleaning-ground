import { readFile, writeFile } from 'node:fs/promises';

const configPath = 'cms/config.yml';
let config = await readFile(configPath, 'utf8');

if (!/^backend:\n(?:  .*\n)*?  auth_scope:/m.test(config)) {
  const branchLine = '  branch: main\n';
  if (!config.includes(branchLine)) {
    throw new Error('Could not locate the Decap CMS GitHub backend branch setting.');
  }
  config = config.replace(branchLine, `${branchLine}  auth_scope: repo\n`);
  await writeFile(configPath, config, 'utf8');
  console.log('Enabled Decap CMS private-repository OAuth scope for this build.');
} else {
  console.log('Decap CMS private-repository OAuth scope is already enabled.');
}
