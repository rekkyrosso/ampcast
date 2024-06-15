import React, {useCallback} from 'react';
import {Except} from 'type-fest';
import {DialogProps, showDialog} from 'components/Dialog';

export interface CredentialsButtonProps
    extends Except<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    dialog: React.FC<DialogProps>;
}

export default function CredentialsButton({dialog, ...props}: CredentialsButtonProps) {
    const handleClick = useCallback(() => {
        showDialog(dialog, true);
    }, [dialog]);

    return (
        <p>
            <button {...props} className="credentials" onClick={handleClick}>
                Enter credentials…
            </button>
        </p>
    );
}
