# Historical sample exposure and review-only cleanup plan

The six real sample/preference JSON files first entered commit `a96c117`. They contain research choices, case identifiers and service output; the audit detected no account credentials. The repository subsequently became public. v1.1 removes them from current tracked source while preserving ignored local originals. No tests/builds require these files; tests use existing synthetic fixtures and synthetic credentials. Sample-path privacy exceptions are removed.

Historical copies remain reachable in Git, including earlier tags and the ancestors of v1.1.0. Prior releases/tags are preserved. Removing current files cannot recall clones, forks, caches, source archives or external copies. No real credentials were validated with providers. No history rewrite or force push was performed. These are remaining privacy exposures, not evidence of a credential incident.

Affected public refs observed before publication:

- `refs/heads/feat/westlaw-offline-prototype` (object `b276471c16675b2d3a7c0680ead2d1f33a0eff61`)
- `refs/heads/main` (object `f25b7faa7b12d228e7dfeb848799e637ad22c1e3`)
- `refs/heads/release/westlaw-plugin-0.1.0beta1` (object `2062a770c959754527d432084d746a79b00e8e3e`)
- `refs/tags/beta` (object `6bca2706ba7818688efb10c058e9886b77ce9eef`)
- `refs/tags/v0.1.0beta1` (object `6bca2706ba7818688efb10c058e9886b77ce9eef`)
- `refs/tags/v0.1.1beta1` (object `1f13fb6dd571ea4175af8a77ca49ef064db9abdb`)

The new `refs/tags/v1.1.0` will also retain the affected ancestry. Exact observed refs and sample-changing commits are in `affected-remote-refs.json`; final remote objects are recorded locally after publication. Other hosting refs, forks, unreachable objects and caches may remain beyond this inventory.

History cleanup is required to remove these historical blobs from repository-controlled refs, but is outside the authorized release and conflicts with preserving existing tag objects. It needs a separate explicit decision. Proposed procedure below is **not executed**. Re-inventory remote refs immediately before approval/execution; stop on any unexpected changes.

1. Pause pushes and coordinate clone/fork owners. In a private backup directory, create a complete mirror and immutable bundle, record every ref and checksum, verify the bundle and test restoration into another private bare repository. Preserve existing release metadata and assets separately. Keep the backup private: it deliberately contains the sensitive history.
2. Work only on a separate disposable mirror. Remove the entire private sample directory from all affected histories using `git-filter-repo`; inspect the resulting ref mapping, verify the directory is absent in every reachable commit, and repeat history secret/privacy checks. Review changed commit/tag identities and any signature loss before promotion.
3. Publish only explicitly reviewed affected heads/tags with per-ref leases against freshly recorded remote object IDs. Never use an unbounded `--mirror` force push. Update GitHub release tag associations only after verifying rewritten objects. Request hosting-provider cache/PR-ref cleanup where applicable; ask clone/fork owners to remove copies. External erasure cannot be guaranteed.
4. Recovery: before normal pushes resume, restore any incorrectly rewritten ref from the private backup mirror using an explicit lease against its rewritten remote object ID. Restore release metadata/assets from backup if changed. The bundle and verified mirror remain recovery authorities until acceptance.

Review commands (PowerShell; choose a private backup location outside this public repository):

```powershell
$backupRoot = 'D:/PrivateBackups/zotero-law-history-review'
New-Item -ItemType Directory -Force $backupRoot
 git clone --mirror https://github.com/mkant18/zotero_law.git "$backupRoot/original.git"
 git -C "$backupRoot/original.git" for-each-ref --format='%(refname) %(objectname)'
 git -C "$backupRoot/original.git" bundle create "$backupRoot/original.bundle" --all
 git -C "$backupRoot/original.git" bundle verify "$backupRoot/original.bundle"
 Get-FileHash "$backupRoot/original.bundle" -Algorithm SHA256
 git clone --mirror "$backupRoot/original.bundle" "$backupRoot/recovery-test.git"
 git clone --mirror --no-hardlinks "$backupRoot/original.git" "$backupRoot/filtered.git"
 git -C "$backupRoot/filtered.git" filter-repo --path westlaw-samples/ --invert-paths --force
 git -C "$backupRoot/filtered.git" log --all -- westlaw-samples/
```

After validating all rewritten blobs and approval, add the remote back to the filtered mirror (filter-repo may remove it), then use one explicit refspec/lease per affected ref. `history-push-review.ps1` records the prepublication exact commands for review; regenerate leases from final remote state, including v1.1.0, before executing. Recovery uses the same explicit refspec pattern from `original.git`, with leases on the new rewritten IDs. Do not execute these commands as part of v1.1 publication.
