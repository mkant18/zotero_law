# M0-B Probe Translator

## Purpose

A temporary minimal web translator that performs the real Chrome MV3 Connector request path (`ZU.request`) to the Westlaw citation service and saves a metadata-only `case` item containing only REDACTED probe facts. It is **not** the parser: it does not parse citation grammar, split names, abbreviate courts, or map reporters.

## What Is / Isn't Recorded

- **Recorded**: case name, URL (GUID-based), decision date, Extra diagnostic lines (request categories, status codes, content types, style IDs, form names, long-form citations, Retry-After, capture stats), tags (`Westlaw: M0 probe`, `Westlaw: needs citation review` when any category ≠ ok).
- **Not recorded**: request headers, URLs with tokens, body text, HTML, error messages from the network layer, `PageEventIdentifier`, `ResourceToken`, `RelatedInfo` host.

## forceFatal Flag

The `M0.forceFatal` constant is a disposable-environment-only escape hatch. When set to `true`, `doWeb` throws `new Error("M0 forced fatal")` before creating any item. Edit the constant only in a disposable profile; do not commit this change.

## Cleanup

This translator must be removed from the Zotero translators directory after M0. It is a temporary spike artifact, not a production translator.

## Known Limitations

- No lint run unless you actually run one.
- Scaffold not used.
- Connector behavior untested (offline node tests only; no live requests).
- The `M0._budgetStart` property is mutated on the `M0` constant for budget tracking; this is intentional for the spike but not a pattern for production code.
