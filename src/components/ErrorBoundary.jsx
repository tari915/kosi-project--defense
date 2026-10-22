import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (this.state.failed) {
            return (
                <div className="crash">
                    <h1>Something went wrong.</h1>
                    <p>Reload the page to continue. If it keeps happening, try again in a moment.</p>
                    <button
                        type="button"
                        className="primary-btn"
                        onClick={() => window.location.reload()}
                    >
                        Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
