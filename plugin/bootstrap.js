/* global Zotero, PathUtils, IOUtils */
var installedFiles = [];
var statePath;
var STYLE_ID = 'http://local.invalid/styles/bluebook-law-review-westlaw-us';

function install() {}

async function startup({ rootURI }) {
  await Zotero.initializationPromise;
  const translator = await Zotero.Translators.get('9abca805-707d-4064-958f-e08ac37f0862');
  const style = Zotero.Styles.get(STYLE_ID);
  const backupDir = PathUtils.join(Zotero.DataDirectory.dir, 'westlaw-us-plugin-backups');
  await IOUtils.makeDirectory(backupDir, { ignoreExisting: true });
  statePath = PathUtils.join(backupDir, 'active-installation.json');
  const saved = await IOUtils.exists(statePath) ? JSON.parse(await IOUtils.readUTF8(statePath)) : [];
  installedFiles = [
    {
      name: 'translator',
      path: translator ? translator.path : PathUtils.join(Zotero.getTranslatorsDirectory().path, 'Westlaw Advantage US.js'),
      source: 'Westlaw Advantage US.js'
    },
    {
      name: 'style',
      path: style ? style.path : PathUtils.join(Zotero.getStylesDirectory().path, 'bluebook-law-review-westlaw-us.csl'),
      source: 'bluebook-law-review-westlaw-us.csl'
    }
  ];
  try {
    for (const entry of installedFiles) {
      entry.contents = Zotero.File.getResource(rootURI + 'resources/' + encodeURIComponent(entry.source));
      entry.previous = await IOUtils.exists(entry.path) ? await IOUtils.readUTF8(entry.path) : null;
      const prior = saved.find(old => old.name === entry.name && old.path === entry.path);
      if (prior && entry.previous === prior.contents) entry.previous = prior.previous;
      if (entry.previous !== null && entry.previous !== entry.contents) {
        await IOUtils.writeUTF8(PathUtils.join(backupDir, entry.name + '-' + Date.now() + '.bak'), entry.previous);
      }
    }
    for (const entry of installedFiles) {
      entry.written = true;
      await IOUtils.writeUTF8(statePath, JSON.stringify(installedFiles), { tmpPath: statePath + '.tmp' });
      await IOUtils.writeUTF8(entry.path, entry.contents, { tmpPath: entry.path + '.westlaw-tmp' });
    }
    await Zotero.Translators.reinit();
    await Zotero.Styles.reinit();
    if (!await Zotero.Translators.get('9abca805-707d-4064-958f-e08ac37f0862') || !Zotero.Styles.get(STYLE_ID)) {
      throw new Error('Westlaw plugin resources were not registered');
    }
    installedFiles[0].ready = true;
    await IOUtils.writeUTF8(statePath, JSON.stringify(installedFiles), { tmpPath: statePath + '.tmp' });
    Zotero.debug('Westlaw Advantage US beta: translator and citation style ready');
  }
  catch (error) {
    await restoreFiles();
    throw error;
  }
}

async function restoreFiles() {
  for (const entry of installedFiles) {
    if (!entry.written || !await IOUtils.exists(entry.path)) continue;
    // Preserve changes made after startup by the user or another installer.
    if (await IOUtils.readUTF8(entry.path) !== entry.contents) continue;
    if (entry.previous === null) await IOUtils.remove(entry.path);
    else await IOUtils.writeUTF8(entry.path, entry.previous, { tmpPath: entry.path + '.westlaw-tmp' });
    entry.written = false;
  }
  await Zotero.Translators.reinit();
  await Zotero.Styles.reinit();
  if (statePath) await IOUtils.remove(statePath, { ignoreAbsent: true });
}

async function shutdown(_data, reason) {
  // Zotero is already closing its database on application shutdown.
  if (reason !== 2) await restoreFiles();
}

function uninstall() {}
