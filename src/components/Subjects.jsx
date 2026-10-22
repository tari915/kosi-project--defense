const SUBJECTS = [
    'Law',
    'Medicine',
    'Economics',
    'Engineering',
    'Biology',
    'Accounting',
    'Psychology',
    'Computer science'
];

export default function Subjects() {
    return (
        <section className="subjects" aria-label="Built for every course">
            <div className="subjects-inner">
                <p className="subjects-label">Built for</p>
                <ul>
                    {SUBJECTS.map((subject) => (
                        <li key={subject}>{subject}</li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
