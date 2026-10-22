const STEPS = [
    {
        number: '01',
        title: 'Upload',
        text: 'Add your lecture material: PDF, DOCX or TXT, up to 10MB.'
    },
    {
        number: '02',
        title: 'Confirm',
        text: 'Pay securely with Paystack. We verify the payment on our server.'
    },
    {
        number: '03',
        title: 'Study',
        text: 'Your summary, flashcards and questions are ready in minutes.'
    }
];

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="how-it-works">
            <div className="how-inner">
                <div className="section-head section-head--light">
                    <div>
                        <p className="kicker kicker--light">03 — How it works</p>
                        <h2>
                            Three steps. <em>That&apos;s it.</em>
                        </h2>
                    </div>
                    <p className="section-lede">
                        No app to install. Your pack opens right here in the browser, and stays in
                        your library for next time.
                    </p>
                </div>

                <ol className="steps">
                    {STEPS.map((step) => (
                        <li className="step" key={step.number}>
                            <span className="step-index">{step.number}</span>
                            <h3>{step.title}</h3>
                            <p>{step.text}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
