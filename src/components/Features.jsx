const FEATURES = [
    {
        number: '01',
        title: 'Smart summaries',
        text: 'Long lectures, condensed into the ideas your exam actually asks for.',
        tag: 'Read'
    },
    {
        number: '02',
        title: 'Flashcards',
        text: 'Key concepts become quick prompts, so recall becomes active instead of passive.',
        tag: 'Recall'
    },
    {
        number: '03',
        title: 'MCQs',
        text: 'Exam-style multiple-choice questions with answers, generated from your own material.',
        tag: 'Practise'
    },
    {
        number: '04',
        title: 'Practice tests',
        text: 'A final pass before the real thing, mixing everything into one focused run.',
        tag: 'Test'
    }
];

export default function Features() {
    return (
        <section id="features" className="features">
            <div className="section-head">
                <div>
                    <p className="kicker">02 — What&apos;s inside</p>
                    <h2>
                        Everything you need to <em>revise properly.</em>
                    </h2>
                </div>
                <p className="section-lede">
                    Each pack is built from your own lecture material, not generic notes. Read the
                    summary, drill the flashcards, then test yourself with exam-style questions.
                </p>
            </div>

            <ol className="feature-list">
                {FEATURES.map((feature) => (
                    <li className="feature-row" key={feature.number}>
                        <span className="feature-index">{feature.number}</span>
                        <div className="feature-copy">
                            <h3>{feature.title}</h3>
                            <p>{feature.text}</p>
                        </div>
                        <span className="feature-tag">{feature.tag}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
