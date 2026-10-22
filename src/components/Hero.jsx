export default function Hero({ children, priceLabel }) {
    return (
        <section className="hero" id="top">
            <div className="hero-content">
                <p className="kicker">01 — AI study packs</p>

                <h1>
                    Turn your lecture notes into your <em>study flow.</em>
                </h1>

                <p className="hero-text">
                    Upload a PDF, DOCX or TXT. StudyFlow reads it and builds a focused summary,
                    flashcards and exam-style questions, ready in minutes.
                </p>

                <div className="hero-buttons">
                    <a href="#upload" className="btn btn--accent">
                        Create my study pack
                        <span className="btn-arrow" aria-hidden="true">
                            ↘
                        </span>
                    </a>
                    <a href="#how-it-works" className="btn btn--ghost">
                        See how it works
                    </a>
                </div>

                <ul className="hero-facts">
                    <li>PDF · DOCX · TXT</li>
                    <li>{priceLabel ? `${priceLabel} per pack` : 'One price per pack'}</li>
                    <li>Ready in minutes</li>
                </ul>
            </div>

            {children}
        </section>
    );
}
