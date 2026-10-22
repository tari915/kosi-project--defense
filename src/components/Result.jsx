import { useEffect, useRef } from 'react';
import { scrollBehavior } from '../lib/motion.js';

function cleanOption(option) {
    return String(option).replace(/^[A-Da-d][.)]\s*/, '');
}

export default function Result({ result, onReset, autoReveal }) {
    const sectionRef = useRef(null);

    useEffect(() => {
        if (!autoReveal) return;

        const node = sectionRef.current;
        if (!node) return;

        node.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        node.focus({ preventScroll: true });
    }, [autoReveal]);

    if (!result) return null;

    const flashcards = Array.isArray(result.flashcards) ? result.flashcards : [];
    const mcqs = Array.isArray(result.mcqs) ? result.mcqs : [];

    function handlePrint() {
        const section = sectionRef.current;
        if (section) {
            section.querySelectorAll('details').forEach((node) => {
                node.open = true;
            });
        }

        window.requestAnimationFrame(() => window.print());
    }

    return (
        <section
            className="result"
            id="result"
            ref={sectionRef}
            tabIndex={-1}
            aria-labelledby="result-title"
        >
            <div className="result-head">
                <div>
                    <p className="kicker">Your pack · Ready</p>
                    <h2 id="result-title">
                        Ready to <em>study.</em>
                    </h2>
                </div>
                <div className="result-actions">
                    <button type="button" className="btn btn--ghost" onClick={handlePrint}>
                        Print / save PDF
                    </button>
                    <button type="button" className="btn btn--primary" onClick={onReset}>
                        New pack
                        <span className="btn-arrow" aria-hidden="true">
                            ↘
                        </span>
                    </button>
                </div>
            </div>

            {result.summary && (
                <article className="result-block">
                    <div className="block-head">
                        <span className="block-index">01</span>
                        <h3>Summary</h3>
                        <span className="block-meta">Your material, condensed</span>
                    </div>
                    <p className="result-summary">{result.summary}</p>
                </article>
            )}

            {flashcards.length > 0 && (
                <article className="result-block">
                    <div className="block-head">
                        <span className="block-index">02</span>
                        <h3>Flashcards</h3>
                        <span className="block-meta">
                            {flashcards.length} card{flashcards.length === 1 ? '' : 's'}
                        </span>
                    </div>
                    <div className="flashcard-grid">
                        {flashcards.map((card, index) => (
                            <details
                                className="flashcard"
                                key={index}
                                style={{ '--i': index }}
                            >
                                <summary>
                                    <span className="card-num">Q{index + 1}</span>
                                    <span className="card-q">{card.q}</span>
                                    <span className="card-toggle" aria-hidden="true">
                                        +
                                    </span>
                                </summary>
                                <p>{card.a}</p>
                            </details>
                        ))}
                    </div>
                </article>
            )}

            {mcqs.length > 0 && (
                <article className="result-block">
                    <div className="block-head">
                        <span className="block-index">03</span>
                        <h3>Practice questions</h3>
                        <span className="block-meta">
                            {mcqs.length} question{mcqs.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    <div className="mcq-list">
                        {mcqs.map((item, index) => (
                            <details className="mcq" key={index} style={{ '--i': index }}>
                                <summary>
                                    <span className="mcq-num">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="mcq-question">{item.question}</span>
                                    <span className="card-toggle" aria-hidden="true">
                                        +
                                    </span>
                                </summary>

                                {Array.isArray(item.options) && item.options.length > 0 && (
                                    <ul className="mcq-options">
                                        {item.options.map((option, optionIndex) => (
                                            <li key={optionIndex}>
                                                <span className="option-letter" aria-hidden="true">
                                                    {String.fromCharCode(65 + optionIndex)}
                                                </span>
                                                <span>{cleanOption(option)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {item.answer && (
                                    <p className="mcq-answer">
                                        <span>Answer</span>
                                        {item.answer}
                                    </p>
                                )}
                            </details>
                        ))}
                    </div>
                </article>
            )}
        </section>
    );
}
