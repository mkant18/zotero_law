"""Strict XML, pinned official CSL RELAX NG, and macro Schematron gate."""
import sys
from pathlib import Path

from lxml import etree, isoschematron


def validate(xml):
    parser = etree.XMLParser(resolve_entities=False, load_dtd=False, no_network=True)
    document = etree.fromstring(xml, parser).getroottree()
    if document.docinfo.doctype:
        raise ValueError("DOCTYPE is not allowed in CSL styles")
    schema_dir = Path(__file__).resolve().parent.parent / "schema"
    schema = etree.RelaxNG(etree.parse(str(schema_dir / "csl.rng"), parser))
    schema.assertValid(document)
    macros = isoschematron.Schematron(etree.parse(str(schema_dir / "csl.sch"), parser))
    macros.assertValid(document)


if __name__ == "__main__":
    try:
        xml = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else sys.stdin.buffer.read()
        validate(xml)
    except (etree.LxmlError, ValueError, OSError) as error:
        print(f"CSL validation failed: {error}", file=sys.stderr)
        sys.exit(1)
    print("CSL XML, official RELAX NG, and Schematron validation passed")
