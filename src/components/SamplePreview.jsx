import { useState } from 'react';
import Icon from './Icon.jsx';
import { samplePack } from '../lib/sample.js';

export default function SamplePreview({ onOpen }) {
  const [tab, setTab] = useState('Summary');
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(null);
  return <div className="sample-window">
    <h2 className="sr-only">Sample study pack preview</h2>
    <div className="sample-toolbar od-row"><div className="od-row od-fill"><span className="mini-mark"><Icon name="book" /></span><span className="od-field"><strong>Cell biology</strong><span className="small muted">An example study pack</span></span></div><span className="sample-label">Sample</span></div>
    <div className="preview-tabs" role="tablist" aria-label="Sample pack sections">{['Summary', 'Flashcards', 'Practice'].map((name, i) => <button key={name} role="tab" type="button" id={`preview-tab-${i}`} aria-selected={tab === name} aria-controls="preview-content" tabIndex={tab === name ? 0 : -1} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const next = (i + (event.key === 'ArrowRight' ? 1 : 2)) % 3; setTab(['Summary', 'Flashcards', 'Practice'][next]); document.getElementById(`preview-tab-${next}`)?.focus(); } }} onClick={() => setTab(name)}><Icon name={['file', 'cards', 'quiz'][i]} />{name}</button>)}</div>
    <div id="preview-content" className="preview-content" role="tabpanel" aria-labelledby={`preview-tab-${['Summary', 'Flashcards', 'Practice'].indexOf(tab)}`}>
      {tab === 'Summary' && <><div className="od-row preview-section-head"><span className="small muted">The essentials, in focus</span><span className="small muted od-nowrap">01 / 03</span></div><h3>Small cells.<br/>Big ideas.</h3><p>Every living thing starts with a cell. Here’s what holds it all together.</p><div className="preview-key"><span className="key-number">01</span><div><strong>The cell membrane</strong><p>A selective boundary that controls what enters and leaves the cell.</p></div></div><div className="preview-key"><span className="key-number">02</span><div><strong>Organelles with a purpose</strong><p>Specialised structures. Each with a specific job.</p></div></div></>}
      {tab === 'Flashcards' && <><p className="small muted">A little recall goes a long way</p><h3>Think first.<br/>Then turn it over.</h3><button type="button" className="preview-flash" onClick={() => setRevealed(!revealed)} aria-expanded={revealed}><span className="small">{revealed ? 'The answer' : 'Your question'}</span><strong>{revealed ? samplePack.flashcards[0].a : samplePack.flashcards[0].q}</strong><span className="text-link">{revealed ? 'Show question' : 'Reveal answer'} <Icon name="refresh"/></span></button></>}
      {tab === 'Practice' && <><p className="small muted">Make what you know stick</p><h3>Put it into<br/>practice.</h3><p>{samplePack.mcqs[0].question}</p><div className="preview-options">{samplePack.mcqs[0].options.slice(0, 3).map((option, i) => <button type="button" key={option} className={selected === i ? (i === 0 ? 'correct' : 'incorrect') : ''} onClick={() => setSelected(i)}><span>{String.fromCharCode(65 + i)}</span>{option}{selected === i && <Icon name={i === 0 ? 'check' : 'close'} />}</button>)}</div>{selected !== null && <p className="small" role="status">{selected === 0 ? 'Correct. The membrane regulates exchange.' : 'Try again. Think about the cell’s boundary.'}</p>}</>}
    </div>
    <div className="preview-foot od-row"><span className="od-row small muted"><Icon name="check"/>Built for active recall</span><button className="icon-button" type="button" onClick={onOpen} aria-label="Open the full sample pack"><Icon name="arrow"/></button></div>
  </div>;
}
