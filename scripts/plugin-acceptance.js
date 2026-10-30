// Run as an async function in Zotero's Run JavaScript window after installation.
const { AddonManager } = ChromeUtils.importESModule('resource://gre/modules/AddonManager.sys.mjs');
const addon = await AddonManager.getAddonByID('westlaw-us@mkant18.github.io');
const translatorID = '9abca805-707d-4064-958f-e08ac37f0862';
const styleID = 'http://local.invalid/styles/bluebook-law-review-westlaw-us';
const statePath = PathUtils.join(Zotero.DataDirectory.dir, 'westlaw-us-plugin-backups', 'active-installation.json');
async function waitFor(predicate) {
  for (let attempt = 0; attempt < 600; attempt++) {
    if (await predicate()) return;
    await Zotero.Promise.delay(50);
  }
  throw new Error('Plugin acceptance timed out');
}
async function ready() {
  return await IOUtils.exists(statePath) && JSON.parse(await IOUtils.readUTF8(statePath))[0].ready;
}
await waitFor(ready);
const installed = JSON.parse(await IOUtils.readUTF8(statePath));
async function matches(field) {
  for (const entry of installed) {
    const actual = await IOUtils.exists(entry.path) ? await IOUtils.readUTF8(entry.path) : null;
    if (actual !== entry[field]) return false;
  }
  return true;
}
if (!await matches('contents')) throw new Error('Installed resources differ from XPI');
await addon.disable();
await waitFor(async () => !await IOUtils.exists(statePath));
if (!await matches('previous')) throw new Error('Disable did not restore previous resources');
await addon.enable();
await waitFor(async () => await ready() && await matches('contents'));
await Zotero.Translators.reinit();
await Zotero.Styles.reinit();
const result = {
  observedAt: new Date().toISOString(), zotero: Zotero.version,
  id: addon.id, version: addon.version, active: addon.isActive,
  installedBytesMatch: true, disabledRestoresOriginals: true, enabledRestoresBundle: true,
  translator: (await Zotero.Translators.get(translatorID)).path,
  style: Zotero.Styles.get(styleID).title,
  scope: 'Native XPI installation and lifecycle; existing live translator saves are separate evidence'
};
const output = PathUtils.join('C:', 'Users', 'micha', 'Documents', 'ChatGPT', 'Zotero_Law', 'reports', 'plugin-native-install.json');
await IOUtils.writeUTF8(output, JSON.stringify(result, null, 2));
return JSON.stringify(result);
