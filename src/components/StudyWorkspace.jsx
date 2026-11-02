import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

export default function StudyWorkspace({
    pack,
    isSample,
    filename,
    title,
    meta,
    backLabel = 'Back to home',
    onBack,
    onNew
}) {
    const [tab, setTab] = useState('summary');
    const [card, setCard] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [answers, setAnswers] = useState({});
    const [printAll, setPrintAll] = useState(false);

    const cards = Array.isArray(pack.flashcards) ? pack.flashcards : [];
    const questions = Array.isArray(pack.mcqs) ? pack.mcqs : [];
    const sections = Array.isArray(pack.sections) ? pack.sections : [];

    const tabs = [
        {
            key: 'summary',
            label: 'Summary',
            icon: 'file',
            count: sections.length || (pack.summary ? 1 : 0)
        },
        ...(cards.length
            ? [{ key: 'flashcards', label: 'Flashcards', icon: 'cards', count: cards.length }]
            : []),
        ...(questions.length
            ? [{ key: 'practice', label: 'Practice', icon: 'quiz', count: questions.length }]
            : [])
    ];

    const nextTab = cards.length ? 'flashcards' : questions.length ? 'practice' : null;
    const activeCard = cards[Math.min(card, cards.length - 1)] || null;
    const score = questions.filter((q, i) => answers[i] === answerIndex(q)).length;
    const answered = Object.keys(answers).length;
    const complete = questions.length > 0 && answered === questions.length;

    useEffect(() => {
        const after = () => setPrintAll(false);
        window.addEventListener('afterprint', after);
        return () => window.removeEventListener('afterprint', after);
    }, []);

    useEffect(() => {
        if (!tabs.some((item) => item.key === tab)) setTab('summary');
    }, [tab, cards.length, questions.length]);

    function print() {
        setPrintAll(true);
        window.setTimeout(() => window.print(), 80);
    }

    function switchTab(key) {
        setTab(key);
        setPrintAll(false);
    }

    function onTabKeyDown(event, index) {
        if (
            !['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)
        ) {
            return;
        }

        event.preventDefault();

        const forward = ['ArrowRight', 'ArrowDown'].includes(event.key);
        const next = (index + (forward ? 1 : -1) + tabs.length) % tabs.length;

        switchTab(tabs[next].key);
        document.getElementById(`study-tab-${tabs[next].key}`)?.focus();
    }

    return (
        <main id="main" className="workspace container" tabIndex={-1}>
            <div className="workspace-path od-row">
                <button type="button" className="text-link" onClick={onBack}>
                    <Icon name="back" />
                    {backLabel}
                </button>
                <span className="muted">/</span>
                <span className="small">{isSample ? 'Sample study pack' : 'Your study pack'}</span>
            </div>

            <div className="workspace-title od-row-top">
                <div className="od-fill">
                    <div className="od-row small muted">
                        <Icon name="file" />
                        <span className="file-full">{filename || 'Your lecture notes'}</span>
                    </div>
                    <h1>
                        {title || pack.title || 'Your study pack'}
                        <span className="green">.</span>
                    </h1>
                    <p className="muted">{meta || 'A little structure. A lot more clarity.'}</p>
                </div>
                <div className="workspace-actions od-cluster">
                    <button type="button" className="button secondary" onClick={print}>
                        <Icon name="print" />
                        Print / save PDF
                    </button>
                    <button type="button" className="button primary" onClick={onNew}>
                        <Icon name="plus" />
                        New pack
                    </button>
                </div>
            </div>

            <div className="notice od-row-top">
                <Icon name="info" />
                <p>
                    {isSample
                        ? 'You’re exploring an example pack about cell biology. This content was written to demonstrate the study experience.'
                        : 'Use this pack as a revision aid and check key facts against your course material.'}
                </p>
            </div>

            <div className="workspace-body">
                <aside className="study-sidebar">
                    <div role="tablist" aria-label="Study sections" className="study-nav">
                        {tabs.map((item, index) => (
                            <button
                                key={item.key}
                                id={`study-tab-${item.key}`}
                                role="tab"
                                type="button"
                                aria-selected={tab === item.key}
                                aria-controls={`panel-${item.key}`}
                                tabIndex={tab === item.key ? 0 : -1}
                                onKeyDown={(event) => onTabKeyDown(event, index)}
                                onClick={() => switchTab(item.key)}
                            >
                                <Icon name={item.icon} />
                                <span>{item.label}</span>
                                <span className="nav-count">
                                    {String(item.count).padStart(2, '0')}
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="study-tip">
                        <Icon name="leaf" />
                        <strong>Make room for recall.</strong>
                        <p>Read a section. Close your notes. See what comes back.</p>
                    </div>
                </aside>

                <div className="study-content">
                    {(tab === 'summary' || printAll) && (
                        <section
                            id="panel-summary"
                            role="tabpanel"
                            aria-labelledby="study-tab-summary"
                            className="study-panel"
                        >
                            <div className="panel-head od-row">
                                <h2>The big picture</h2>
                                <span className="small muted">Summary</span>
                            </div>

                            {pack.summary ? (
                                <p className="summary-lead">{pack.summary}</p>
                            ) : (
                                <Empty text="No summary is available for this pack. Try the practice questions." />
                            )}

                            {sections.map((section, index) => (
                                <article className="summary-section" key={section.title}>
                                    <span className="summary-index">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <div>
                                        <h3>{section.title}</h3>
                                        <p>{section.text}</p>
                                    </div>
                                </article>
                            ))}

                            {nextTab && (
                                <div className="study-next od-row">
                                    <p className="od-fill">Read it? Now recall it.</p>
                                    <button
                                        type="button"
                                        className="text-link"
                                        onClick={() => switchTab(nextTab)}
                                    >
                                        {nextTab === 'flashcards'
                                            ? 'Open flashcards'
                                            : 'Open practice questions'}
                                        <Icon name="arrow" />
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {(tab === 'flashcards' || printAll) && cards.length > 0 && (
                        <section
                            id="panel-flashcards"
                            role="tabpanel"
                            aria-labelledby="study-tab-flashcards"
                            className="study-panel"
                        >
                            <div className="panel-head od-row">
                                <h2>A moment to remember</h2>
                                <span className="small muted od-nowrap">
                                    {card + 1} of {cards.length}
                                </span>
                            </div>

                            <p className="muted">
                                Think of your answer before revealing the other side.
                            </p>

                            <button
                                type="button"
                                className="study-flashcard"
                                onClick={() => setRevealed(!revealed)}
                                aria-expanded={revealed}
                            >
                                <span className="small green">
                                    {revealed ? 'Answer' : `Question ${card + 1}`}
                                </span>
                                <strong>{revealed ? activeCard.a : activeCard.q}</strong>
                                <span className="text-link">
                                    <Icon name="refresh" />
                                    {revealed ? 'Show question' : 'Reveal answer'}
                                </span>
                            </button>

                            <div className="card-controls od-row">
                                <button
                                    type="button"
                                    className="button secondary"
                                    disabled={card === 0}
                                    onClick={() => {
                                        setCard(card - 1);
                                        setRevealed(false);
                                    }}
                                >
                                    <Icon name="back" />
                                    Previous
                                </button>
                                <span className="small muted od-fill" role="status">
                                    Card {card + 1} of {cards.length}
                                </span>
                                <button
                                    type="button"
                                    className="button secondary"
                                    disabled={card === cards.length - 1}
                                    onClick={() => {
                                        setCard(card + 1);
                                        setRevealed(false);
                                    }}
                                >
                                    Next
                                    <Icon name="chevron" />
                                </button>
                            </div>

                            {card === cards.length - 1 && questions.length > 0 && (
                                <button
                                    type="button"
                                    className="text-link practice-next"
                                    onClick={() => switchTab('practice')}
                                >
                                    Ready for practice questions?
                                    <Icon name="arrow" />
                                </button>
                            )}

                            <div className="print-only">
                                {cards.map((item, index) => (
                                    <article key={index}>
                                        <h3>{item.q}</h3>
                                        <p>{item.a}</p>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}

                    {(tab === 'practice' || printAll) && questions.length > 0 && (
                        <section
                            id="panel-practice"
                            role="tabpanel"
                            aria-labelledby="study-tab-practice"
                            className="study-panel"
                        >
                            <div className="panel-head od-row">
                                <h2>Put it into practice</h2>
                                <span className="small muted od-nowrap">
                                    {answered} / {questions.length} answered
                                </span>
                            </div>

                            <p className="muted">Choose an answer. Learn from the explanation.</p>

                            {questions.map((question, index) => {
                                const chosen = answers[index];
                                const correct = answerIndex(question);

                                return (
                                    <article className="question-block" key={index}>
                                        <h3>
                                            <span className="question-number">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                            {question.question}
                                        </h3>

                                        <div
                                            className="question-options"
                                            role="group"
                                            aria-label={`Answers for question ${index + 1}`}
                                        >
                                            {(question.options || []).map((option, optionIndex) => (
                                                <button
                                                    type="button"
                                                    key={optionIndex}
                                                    aria-pressed={chosen === optionIndex}
                                                    disabled={chosen !== undefined}
                                                    className={`answer-option ${
                                                        chosen !== undefined &&
                                                        optionIndex === correct
                                                            ? 'correct'
                                                            : chosen === optionIndex
                                                              ? 'incorrect'
                                                              : ''
                                                    }`}
                                                    onClick={() =>
                                                        setAnswers({
                                                            ...answers,
                                                            [index]: optionIndex
                                                        })
                                                    }
                                                >
                                                    <span className="option-letter">
                                                        {String.fromCharCode(65 + optionIndex)}
                                                    </span>
                                                    <span className="od-fill">
                                                        {String(option).replace(
                                                            /^[A-Da-d][.)]\s*/,
                                                            ''
                                                        )}
                                                    </span>
                                                    {chosen !== undefined &&
                                                        (optionIndex === correct ||
                                                            chosen === optionIndex) && (
                                                            <Icon
                                                                name={
                                                                    optionIndex === correct
                                                                        ? 'check'
                                                                        : 'close'
                                                                }
                                                            />
                                                        )}
                                                </button>
                                            ))}
                                        </div>

                                        {chosen !== undefined && (
                                            <p
                                                className={`answer-feedback ${
                                                    chosen === correct ? 'green' : 'danger'
                                                }`}
                                                role="status"
                                            >
                                                <strong>
                                                    {chosen === correct
                                                        ? 'That’s right.'
                                                        : `The answer is ${String.fromCharCode(
                                                              65 + correct
                                                          )}.`}
                                                </strong>{' '}
                                                {question.explanation ||
                                                    'Review the summary to reinforce this concept.'}
                                            </p>
                                        )}

                                        <p className="print-only">Answer: {question.answer}</p>
                                    </article>
                                );
                            })}

                            {complete && (
                                <div className="quiz-complete">
                                    <Icon name="check" />
                                    <h3>A good place to build from.</h3>
                                    <p>
                                        You answered {score} of {questions.length} questions
                                        correctly.
                                    </p>
                                    <button
                                        type="button"
                                        className="button secondary"
                                        onClick={() => setAnswers({})}
                                    >
                                        <Icon name="refresh" />
                                        Practise again
                                    </button>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}

function answerIndex(question) {
    const text = String(question.answer || 'A').trim();
    const letter = text.match(/^[A-D](?:\b|[.)])/i);

    return letter
        ? letter[0].charAt(0).toUpperCase().charCodeAt(0) - 65
        : Math.max(
              0,
              question.options?.findIndex((option) => String(option) === text) ?? 0
          );
}

function Empty({ text }) {
    return (
        <div className="empty-state">
            <Icon name="book" />
            <p>{text}</p>
        </div>
    );
}
