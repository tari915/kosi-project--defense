export const MAX_FILE_MB = 10;
export const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];

export function validateFile(file) {
    if (!file) return 'Choose a file first.';

    const extension = file.name.split('.').pop().toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return 'Only PDF, DOCX or TXT files are allowed.';
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
        return 'That file is larger than ' + MAX_FILE_MB + 'MB.';
    }

    return '';
}

export function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Enter a valid email address.';
}
