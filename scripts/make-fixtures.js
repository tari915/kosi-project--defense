const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const ROOT = path.join(__dirname, '..');

const TEXT = [
    'Photosynthesis is the process by which green plants convert light energy into chemical energy.',
    'It takes place in the chloroplasts and involves two stages: the light-dependent reactions and the Calvin cycle.',
    'The light reactions produce ATP and NADPH, while the Calvin cycle uses them to fix carbon dioxide into glucose.',
    'Chlorophyll absorbs mostly red and blue light, reflecting green wavelengths.',
    'Factors affecting the rate include light intensity, carbon dioxide concentration and temperature.'
].join(' ');

function pdfEscape(value) {
    return String(value).replace(/([()\\])/g, '\\$1');
}

function makePdf(file) {
    const content =
        'BT\n/F1 14 Tf\n72 720 Td\n(' +
        pdfEscape(TEXT.slice(0, 105)) +
        ') Tj\n0 -22 Td\n(' +
        pdfEscape(TEXT.slice(105, 210)) +
        ') Tj\n0 -22 Td\n(' +
        pdfEscape(TEXT.slice(210)) +
        ') Tj\nET\n';

    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Length ' + Buffer.byteLength(content) + ' >>\nstream\n' + content + 'endstream'
    ];

    let body = '%PDF-1.4\n';
    const offsets = [0];

    objects.forEach((object, index) => {
        offsets[index + 1] = Buffer.byteLength(body);
        body += index + 1 + ' 0 obj\n' + object + '\nendobj\n';
    });

    const xrefOffset = Buffer.byteLength(body);
    body += 'xref\n0 ' + (objects.length + 1) + '\n';
    body += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i += 1) {
        body += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    }
    body +=
        'trailer\n<< /Size ' +
        (objects.length + 1) +
        ' /Root 1 0 R >>\nstartxref\n' +
        xrefOffset +
        '\n%%EOF\n';

    fs.writeFileSync(file, Buffer.from(body, 'latin1'));
}

async function makeDocx(file) {
    const zip = new JSZip();

    zip.file(
        '[Content_Types].xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
            '</Types>'
    );

    zip.file(
        '_rels/.rels',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
            '</Relationships>'
    );

    zip.file(
        'word/document.xml',
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
            '<w:body><w:p><w:r><w:t>' +
            TEXT +
            '</w:t></w:r></w:p></w:body></w:document>'
    );

    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
}

async function main() {
    makePdf(path.join(ROOT, 'tmp-test.pdf'));
    await makeDocx(path.join(ROOT, 'tmp-test.docx'));
    console.log('fixtures written');
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
