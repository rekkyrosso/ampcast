import React from 'react';

export interface DialogButtonsProps {
    value?: string;
    submitText?: React.ReactNode;
    onCancel?: (event: React.FormEvent) => void;
    onSubmit?: (event: React.FormEvent) => void;
}

export default function DialogButtons({
    value = '',
    submitText = 'Confirm',
    onCancel,
    onSubmit,
}: DialogButtonsProps) {
    return (
        <footer className="dialog-buttons">
            <button type="button" value="#cancel" onClick={onCancel}>
                Cancel
            </button>
            <button value={value} onClick={onSubmit}>
                {submitText}
            </button>
        </footer>
    );
}
