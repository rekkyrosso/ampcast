import React, {useCallback, useId, useState} from 'react';
import Dialog, {DialogProps} from './Dialog';
import showDialog from './showDialog';

export default async function prompt(
    label: string,
    title?: string,
    system?: boolean
): Promise<string> {
    return showDialog(
        (props: DialogProps) => <PromptDialog {...props} title={title} label={label} />,
        system
    );
}

export interface PromptDialogProps extends DialogProps {
    title?: string;
    label: string;
}

export function PromptDialog({label, title = 'Input', ...props}: PromptDialogProps) {
    const id = useId();
    const [value, setValue] = useState('');

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value);
    }, []);

    return (
        <Dialog {...props} className="prompt-dialog" title={title}>
            <form method="dialog">
                <p className="prompt-message">
                    <label htmlFor={id}>{label}: </label>
                </p>
                <p>
                    <input type="text" id={id} autoFocus onChange={handleChange} />
                </p>
                <footer className="dialog-buttons">
                    <button value="#cancel">Cancel</button>
                    <button value={value}>Confirm</button>
                </footer>
            </form>
        </Dialog>
    );
}
