import AppShell from '../components/app/AppShell.jsx';
import Icon from '../components/Icon.jsx';
import { faqs } from '../lib/faqs.js';
import { Link } from '../lib/router.jsx';

const fixes = [
    {
        title: 'The upgrade window did not open',
        text: 'Check that your browser is not blocking pop-ups for StudyFlow, then try again. You are not charged until the payment is completed.'
    },
    {
        title: 'I paid but Premium is not active',
        text: 'Open your account and refresh the plan card. If it still shows Free, keep the Paystack reference and contact support so we can check the payment.'
    },
    {
        title: 'My pack is still being prepared',
        text: 'Most packs finish in under a minute. The library updates automatically while a pack is being built.'
    },
    {
        title: 'I have used all my uploads',
        text: 'On Free, upgrade to Premium for 10 more uploads. On Premium, your allowance resets when you renew after the current 30-day period ends. Existing packs stay in your library.'
    },
    {
        title: 'My file will not upload',
        text: 'Use one PDF, DOCX or TXT file under 10 MB. A document with selectable text gives the clearest summary and questions.'
    }
];

export default function HelpPage() {
    return (
        <AppShell>
            <main id="main" className="app-page help-page" tabIndex={-1}>
                <div className="container">
                    <header className="app-page-head">
                        <div>
                            <p className="app-kicker">Help</p>
                            <h1>
                                A little help, <em>right here.</em>
                            </h1>
                            <p className="app-page-lede">
                                Straight answers about plans, uploads and the packs in your
                                library. If something still looks wrong, the reference on your
                                pack is the best place to start.
                            </p>
                        </div>

                        <div className="help-quick">
                            <Link to="/new" className="button primary">
                                New pack
                                <Icon name="plus" />
                            </Link>
                            <Link to="/dashboard" className="button secondary">
                                My packs
                            </Link>
                        </div>
                    </header>

                    <div className="help-grid">
                        <section className="help-faq" aria-labelledby="help-faq-heading">
                            <div className="help-section-head">
                                <h2 id="help-faq-heading">Questions & answers</h2>
                                <span className="side-label">{faqs.length} answers</span>
                            </div>
                            <div className="faq-list">
                                {faqs.map(([question, answer]) => (
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

                        <aside className="help-side">
                            <section className="side-card help-fixes">
                                <div className="side-card-head">
                                    <h2>Common fixes</h2>
                                </div>
                                <div className="help-fix-list">
                                    {fixes.map((fix) => (
                                        <article key={fix.title}>
                                            <h3>{fix.title}</h3>
                                            <p>{fix.text}</p>
                                        </article>
                                    ))}
                                </div>
                            </section>

                            <section className="side-card side-card--sample">
                                <span className="side-sample-icon">
                                    <Icon name="book" />
                                </span>
                                <h2>Not sure yet?</h2>
                                <p>
                                    Open the sample pack to see the summary, flashcards and
                                    practice questions before you upload anything.
                                </p>
                                <Link to="/sample" className="text-link">
                                    Open the sample
                                    <Icon name="arrow" />
                                </Link>
                            </section>

                            <section className="side-card">
                                <h2>Plan & billing</h2>
                                <p>
                                    Your plan, uploads used and Premium end date live on your
                                    account page. You can upgrade from there or from the
                                    workspace.
                                </p>
                                <Link to="/account" className="text-link">
                                    Open account
                                    <Icon name="arrow" />
                                </Link>
                            </section>
                        </aside>
                    </div>
                </div>
            </main>
        </AppShell>
    );
}
