import AppShell from '../components/app/AppShell.jsx';
import Icon from '../components/Icon.jsx';
import SamplePreview from '../components/SamplePreview.jsx';
import { faqs } from '../lib/faqs.js';
import { Link, navigate } from '../lib/router.jsx';

const steps = [
    {
        title: 'Bring your material',
        text: 'Choose your lecture notes and sign in to keep your study packs together.',
        icon: 'up'
    },
    {
        title: 'Start free, or go Premium',
        text: 'Your first pack is free. Premium unlocks 10 uploads over 30 days for busier weeks.',
        icon: 'cards'
    },
    {
        title: 'Find your study flow',
        text: 'Read the summary, test your recall, and work through the questions.',
        icon: 'book'
    }
];

const features = [
    {
        title: 'Find the big picture',
        text: 'A focused summary brings the main ideas together, so you know where to begin. Premium adds detailed revision notes.',
        name: 'Summary',
        icon: 'file'
    },
    {
        title: 'Bring it back to mind',
        text: 'Question on one side. Answer on the other. A simple space to practise active recall, included with Premium.',
        name: 'Flashcards',
        icon: 'cards'
    },
    {
        title: 'See what you know',
        text: 'Five practice questions on Free, or twelve with explanations on Premium. Check your answers and revisit what needs attention.',
        name: 'Practice',
        icon: 'quiz'
    }
];

const freePlan = [
    '1 document upload',
    '1 full study pack',
    'Focused summary',
    '5 practice questions',
    'Saved in your library'
];

const premiumPlan = [
    '10 document uploads per 30 days',
    'Detailed summaries and revision notes',
    '8–12 flashcards per pack',
    '12 practice questions with explanations',
    'Existing packs stay available'
];

export default function WelcomePage() {
    return (
        <AppShell>
            <main id="main" className="marketing-page" tabIndex={-1}>
                <section className="hero container">
                    <div className="hero-copy">
                        <div className="hero-note">
                            <span className="note-line" />
                            A little less overwhelm. A little more flow.
                        </div>
                        <h1>
                            Your notes.
                            <br />
                            A clearer way
                            <br />
                            to <span className="hero-emphasis">revise.</span>
                        </h1>
                        <p className="hero-lede">
                            Find the structure in your lecture notes.
                            <br className="desktop-break" /> Summaries, flashcards, and practice
                            questions,
                            <br className="desktop-break" /> together in one focused study pack.
                            Start with one free.
                        </p>
                        <div className="hero-actions od-cluster">
                            <Link to="/new" className="button primary large">
                                Create a free pack
                                <Icon name="arrow" />
                            </Link>
                            <Link to="/sample" className="text-link">
                                Explore a sample
                                <Icon name="chevron" />
                            </Link>
                        </div>
                        <div className="hero-facts od-cluster">
                            <span>
                                <Icon name="check" />
                                Free plan to start
                            </span>
                            <span>
                                <Icon name="check" />
                                ₦5,000 / 30 days for Premium
                            </span>
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="preview-caption od-row">
                            <span className="caption-dot" />
                            <span>FROM NOTES TO KNOWING</span>
                            <span className="caption-rule" />
                        </div>
                        <SamplePreview onOpen={() => navigate('/sample')} />
                        <p className="visual-footnote">A preview of your next study session.</p>
                    </div>
                </section>

                <section className="subject-strip" aria-label="Bring your course notes">
                    <div className="container subject-inner">
                        <span className="subject-label">
                            Different courses.
                            <br />
                            <strong>The same need for clarity.</strong>
                        </span>
                        <div className="subject-names">
                            <span>Biology</span>
                            <span>Economics</span>
                            <span>Law</span>
                            <span>Engineering</span>
                            <span>Medicine</span>
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="how-section container">
                    <div className="section-heading">
                        <h2>
                            Less sorting.
                            <br />
                            More understanding.
                        </h2>
                        <p>
                            You've already done the note taking.
                            <br />
                            Give your revision a little direction.
                        </p>
                    </div>
                    <ol className="process-grid">
                        {steps.map((step, index) => (
                            <li key={step.title}>
                                <div className="process-top od-row">
                                    <span className="process-number">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <Icon name={step.icon} />
                                </div>
                                <h3>{step.title}</h3>
                                <p>{step.text}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="pack-section" id="features">
                    <div className="container pack-layout">
                        <div className="pack-intro">
                            <h2>
                                One pack.
                                <br />
                                Three ways
                                <br />
                                to make it stick.
                            </h2>
                            <p>
                                Move from reading to remembering.
                                <br />
                                Keep everything in one place.
                            </p>
                            <Link to="/sample" className="text-link">
                                Open the sample pack
                                <Icon name="arrow" />
                            </Link>
                        </div>
                        <div className="pack-features">
                            {features.map((feature, index) => (
                                <article className="pack-feature" key={feature.name}>
                                    <span className="feature-symbol">
                                        <Icon name={feature.icon} />
                                    </span>
                                    <div>
                                        <span className="small green">{feature.name}</span>
                                        <h3>{feature.title}</h3>
                                        <p>{feature.text}</p>
                                    </div>
                                    <span className="feature-number">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="pricing-section container" id="pricing">
                    <div className="section-heading pricing-heading">
                        <h2>
                            Start free.
                            <br />
                            Upgrade when you need more.
                        </h2>
                        <p>
                            One account. Your packs stay in your library whether you are on Free
                            or Premium.
                        </p>
                    </div>

                    <div className="pricing-grid">
                        <article className="price-card">
                            <div className="price-card-head">
                                <span className="price-name">Free</span>
                            </div>
                            <p className="price-amount">
                                ₦0<span>to start</span>
                            </p>
                            <p className="price-lede">
                                A full first pack, so you can see how StudyFlow fits your
                                revision.
                            </p>
                            <ul className="price-list">
                                {freePlan.map((item) => (
                                    <li key={item}>
                                        <Icon name="check" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/new" className="button secondary wide">
                                Create a free pack
                            </Link>
                            <p className="price-foot">No card needed.</p>
                        </article>

                        <article className="price-card price-card--premium">
                            <span className="price-flag">Best for exam season</span>
                            <div className="price-card-head">
                                <span className="price-name">Premium</span>
                            </div>
                            <p className="price-amount">
                                ₦5,000<span>/ 30 days</span>
                            </p>
                            <p className="price-lede">
                                For the weeks when you have more than one course to carry.
                            </p>
                            <ul className="price-list">
                                {premiumPlan.map((item) => (
                                    <li key={item}>
                                        <Icon name="check" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/account" className="button primary wide">
                                Get Premium
                                <Icon name="arrow" />
                            </Link>
                            <p className="price-foot">
                                One payment. 30 days. No per-pack charges.
                            </p>
                        </article>
                    </div>
                </section>

                <section className="welcome-cta container">
                    <div className="welcome-cta-copy">
                        <p className="app-kicker">Start here</p>
                        <h2>
                            One document. <em>A clearer place to begin.</em>
                        </h2>
                        <p>
                            Your first pack is free. Bring the notes you already have and leave
                            with a summary, flashcards and questions you can use.
                        </p>
                    </div>
                    <div className="welcome-cta-actions">
                        <Link to="/new" className="button primary large">
                            Create a free pack
                            <Icon name="arrow" />
                        </Link>
                        <Link to="/sample" className="button secondary large">
                            Explore the sample
                        </Link>
                    </div>
                </section>

                <section className="clarity-section container">
                    <Icon name="leaf" />
                    <h2>
                        A clearer head.
                        <br />
                        <span className="green">A better place to begin.</span>
                    </h2>
                    <p>Make room for the part that matters: understanding.</p>
                </section>

                <section className="faq-section container" id="questions">
                    <div className="faq-intro">
                        <h2>
                            A few things
                            <br />
                            you might
                            <br />
                            be wondering.
                        </h2>
                        <p>
                            Good questions deserve
                            <br />
                            straightforward answers.
                        </p>
                        <Link to="/help" className="text-link">
                            More help
                            <Icon name="arrow" />
                        </Link>
                    </div>
                    <div className="faq-list">
                        {faqs.slice(0, 6).map(([question, answer]) => (
                            <details className="faq-item" key={question}>
                                <summary>
                                    {question}
                                    <span className="faq-plus">
                                        <Icon name="plus" />
                                    </span>
                                </summary>
                                <p>{answer}</p>
                            </details>
                        ))}
                    </div>
                </section>
            </main>
        </AppShell>
    );
}
