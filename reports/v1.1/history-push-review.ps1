# REVIEW ONLY. NOT AUTHORIZED OR EXECUTED. Refresh leases before use.
git -C "$backupRoot/filtered.git" push origin --force-with-lease=refs/heads/feat/westlaw-offline-prototype:b276471c16675b2d3a7c0680ead2d1f33a0eff61 refs/heads/feat/westlaw-offline-prototype:refs/heads/feat/westlaw-offline-prototype
git -C "$backupRoot/filtered.git" push origin --force-with-lease=refs/heads/main:f25b7faa7b12d228e7dfeb848799e637ad22c1e3 refs/heads/main:refs/heads/main
git -C "$backupRoot/filtered.git" push origin --force-with-lease=refs/heads/release/westlaw-plugin-0.1.0beta1:2062a770c959754527d432084d746a79b00e8e3e refs/heads/release/westlaw-plugin-0.1.0beta1:refs/heads/release/westlaw-plugin-0.1.0beta1
git -C "$backupRoot/filtered.git" push origin --force-with-lease=refs/tags/beta:6bca2706ba7818688efb10c058e9886b77ce9eef refs/tags/beta:refs/tags/beta
git -C "$backupRoot/filtered.git" push origin --force-with-lease=refs/tags/v0.1.0beta1:6bca2706ba7818688efb10c058e9886b77ce9eef refs/tags/v0.1.0beta1:refs/tags/v0.1.0beta1
git -C "$backupRoot/filtered.git" push origin --force-with-lease=refs/tags/v0.1.1beta1:1f13fb6dd571ea4175af8a77ca49ef064db9abdb refs/tags/v0.1.1beta1:refs/tags/v0.1.1beta1
