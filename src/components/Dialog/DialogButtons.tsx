import React from 'react';
import Button from 'components/Button';

export interface DialogButtonsProps {
    className?: string;
    value?: string;
    disabled?: boolean;
    submitText?: React.ReactNode;
}

export default function DialogButtons({
    className = '',
    value = '',
    disabled,
    submitText = 'Confirm',
}: DialogButtonsProps) {
    return (
        <footer className={`dialog-buttons ${className}`}>
            <Button className="dialog-button-cancel" type="button" value="#cancel">
                Cancel
            </Button>
            <Button
                className="dialog-button-submit"
                type="submit"
                value={value}
                disabled={disabled}
            >
                {submitText}
            </Button>
        </footer>
    );
}
