import React from 'react';
import Button from 'components/Button';

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
            <Button className="dialog-button-cancel" type="button" value="#cancel">
                Cancel
            </Button>
            <Button className="dialog-button-submit" value={value} disabled={disabled}>
                {submitText}
            </Button>
        </footer>
    );
}
