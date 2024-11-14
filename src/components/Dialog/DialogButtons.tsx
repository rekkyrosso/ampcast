import React from 'react';

export interface DialogButtonsProps {
    value?: string;
    disabled?: boolean;
    submitText?: React.ReactNode;
}

export default function DialogButtons({
    value = '',
    disabled,
    submitText = 'Confirm',
}: DialogButtonsProps) {
    return (
        <footer className="dialog-buttons">
            <button className="dialog-button-cancel" type="button" value="#cancel">
                Cancel
            </button>
            <button className="dialog-button-submit" value={value} disabled={disabled}>
                {submitText}
            </button>
        </footer>
    );
}
