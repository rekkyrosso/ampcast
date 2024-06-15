import React from 'react';

export interface DialogButtonsProps {
    value?: string;
    disabled?: boolean;
    submitText?: React.ReactNode;
    onCancelClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onSubmitClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function DialogButtons({
    value = '',
    disabled,
    submitText = 'Confirm',
    onCancelClick,
    onSubmitClick,
}: DialogButtonsProps) {
    return (
        <footer className="dialog-buttons">
            <button
                className="dialog-button-cancel"
                type="button"
                value="#cancel"
                onClick={onCancelClick}
            >
                Cancel
            </button>
            <button
                className="dialog-button-submit"
                value={value}
                disabled={disabled}
                onClick={onSubmitClick}
            >
                {submitText}
            </button>
        </footer>
    );
}
