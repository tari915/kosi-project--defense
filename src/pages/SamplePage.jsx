import AppShell from '../components/app/AppShell.jsx';
import StudyWorkspace from '../components/StudyWorkspace.jsx';
import { samplePack } from '../lib/sample.js';
import { navigate } from '../lib/router.jsx';

export default function SamplePage() {
    return (
        <AppShell>
            <StudyWorkspace
                pack={samplePack}
                isSample
                filename={samplePack.filename}
                title={samplePack.title}
                meta="An example pack. Read the summary, reveal the flashcards, then try the questions."
                backLabel="Back to workspace"
                onBack={() => navigate('/new')}
                onNew={() => navigate('/new')}
            />
        </AppShell>
    );
}
