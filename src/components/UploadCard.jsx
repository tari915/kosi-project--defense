import { useRef, useState } from 'react';

export default function UploadCard({
    file,
    onFile,
    error,
    disabled,
    authLoading,
    user,
    onSignIn,
    onSignOut,
    savedOrder,
    recoverable,
    onResume,
    restoredReady,
    onViewResult,
    priceLabel
}) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    function pickFile(nextFile) {
        if (disabled) return;

        const accepted = onFile(nextFile || null);

        if (!accepted && inputRef.current) {
            inputRef.current.value = '';
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        setDragging(false);
        if (disabled) return;

        const dropped = event.dataTransfer.files && event.dataTransfer.files[0];
        if (dropped) pickFile(dropped);
    }

    function handleDragLeave(event) {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setDragging(false);
        }
    }

    return (
        <div
            className={
                'upload-card' +
                (dragging ? ' dragover' : '') +
                (disabled ? ' is-disabled' : '')
            }
            id="upload"
            aria-busy={disabled || undefined}
            onDragEnter={(event) => {
                event.preventDefault();
                if (!disabled) setDragging(true);
            }}
            onDragOver={(event) => {
                event.preventDefault();
                if (!disabled) setDragging(true);
            }}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="sheet-head">
                <span className="sheet-label">Study pack · Intake</span>
                <span className="sheet-price">{priceLabel || '₦ —'}</span>
            </div>

            <div className="drop-zone">
                <span className="drop-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path
                            d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </span>

                <h2>Upload your material</h2>
                <p className="drop-hint">
                    Drop a file here or choose one.
                    <br />
                    PDF, DOCX or TXT · up to 10MB
                </p>

                <input
                    ref={inputRef}
                    type="file"
                    id="fileInput"
                    accept=".pdf,.docx,.txt"
                    hidden
                    onChange={(event) => pickFile(event.target.files && event.target.files[0])}
                />

                <button
                    className="btn btn--primary upload-btn"
                    id="chooseFile"
                    type="button"
                    disabled={disabled}
                    onClick={() => inputRef.current && inputRef.current.click()}
                >
                    <span className="swap-label">
                        <span
                            className="swap-item"
                            data-hidden={file ? 'true' : undefined}
                            aria-hidden={file ? true : undefined}
                        >
                            Choose file
                        </span>
                        <span
                            className="swap-item"
                            data-hidden={file ? undefined : 'true'}
                            aria-hidden={file ? undefined : true}
                        >
                            Change file
                        </span>
                    </span>
                </button>

                {file && (
                    <p className="file-name" key={file.name}>
                        <span className="file-check" aria-hidden="true">
                            ✓
                        </span>
                        {file.name}
                    </p>
                )}
            </div>

            <div className="account-field">
                <span className="field-label">Account</span>

                {authLoading ? (
                    <p className="account-loading">Checking your account…</p>
                ) : user ? (
                    <div className="account-row">
                        <span className="account-email" title={user.email}>
                            {user.email}
                        </span>
                        <button type="button" className="link-btn" onClick={onSignOut}>
                            Sign out
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="account-signin"
                        onClick={() => onSignIn('signin', 'Sign in to buy a study pack.')}
                    >
                        <span>Sign in or create an account</span>
                        <span className="btn-arrow" aria-hidden="true">
                            ↘
                        </span>
                    </button>
                )}
            </div>

            {error && (
                <p className="field-error" role="alert">
                    {error}
                </p>
            )}

            {savedOrder && !authLoading && !user && (
                <p className="recover-note">
                    Sign in to open your saved pack.{' '}
                    <button
                        type="button"
                        className="link-btn"
                        onClick={() => onSignIn('signin', 'Sign in to open your saved pack.')}
                    >
                        Sign in
                    </button>
                </p>
            )}

            {restoredReady && (
                <p className="recover-note">
                    Your last study pack is ready.{' '}
                    <button type="button" className="link-btn" onClick={onViewResult}>
                        View pack
                    </button>
                </p>
            )}

            {recoverable && !restoredReady && (
                <p className="recover-note">
                    You have an unfinished order.{' '}
                    <button type="button" className="link-btn" onClick={onResume}>
                        Check status
                    </button>
                </p>
            )}

            <div className="sheet-foot">
                <span>Secured by Paystack</span>
                <span aria-hidden="true">·</span>
                <span>Private by default</span>
            </div>
        </div>
    );
}
