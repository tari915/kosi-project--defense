const fs = require('fs');
const path = require('path');
const { extractText } = require('../lib/extract.js');

const ROOT = path.join(__dirname, '..');

async function main() {
    const txt = [
        'Photosynthesis is the process by which green plants convert light energy into chemical energy.',
        'It takes place in the chloroplasts and involves two stages: the light-dependent reactions and the Calvin cycle.',
        'The light reactions produce ATP and NADPH, while the Calvin cycle uses them to fix carbon dioxide into glucose.',
        'Chlorophyll absorbs mostly red and blue light, reflecting green wavelengths.',
        'Factors affecting the rate include light intensity, carbon dioxide concentration and temperature.'
    ].join(' ');

    const fromTxt = await extractText(Buffer.from(txt, 'utf8'), 'lecture.txt');
    console.log('TXT chars:', fromTxt.length);

    const fromPdf = await extractText(fs.readFileSync(path.join(ROOT, 'tmp-test.pdf')), 'lecture.pdf');
    console.log('PDF chars:', fromPdf.length);

    const fromDocx = await extractText(
        fs.readFileSync(path.join(ROOT, 'tmp-test.docx')),
        'lecture.docx'
    );
    console.log('DOCX chars:', fromDocx.length);
}

main().catch((error) => {
    console.error('EXTRACTION FAILED:', error);
    process.exit(1);
});
