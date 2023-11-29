import React from 'react';

export interface DialogButtonsProps {
    value?: string;
    submitText?: React.ReactNode;
    onCancel?: (event: React.MouseEvent) => void;
    onSubmit?: (event: React.MouseEvent) => void;
}

export default function DialogButtons({
    value = '',
    submitText = 'Confirm',
    onCancel,
    onSubmit,
}: DialogButtonsProps) {
    return (
        <footer className="dialog-buttons">
            <button
                className="dialog-button-cancel"
                type="button"
                value="#cancel"
                onClick={onCancel}
            >
                Cancel
            </button>
            <button className="dialog-button-submit" value={value} onClick={onSubmit}>
                {submitText}
            </button>
        </footer>
    );
}
