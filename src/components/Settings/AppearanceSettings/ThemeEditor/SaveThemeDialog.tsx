import React, {useCallback, useId, useRef, useState} from 'react';
import Dialog, {DialogProps} from 'components/Dialog';
import useUserThemes from '../useUserThemes';
import confirmOverwriteTheme from '../confirmOverwriteTheme';
import './SaveThemeDialog.scss';

export interface SaveThemeDialogProps extends DialogProps {
    suggestedName: string;
}

export default function SaveThemeDialog({suggestedName, ...props}: SaveThemeDialogProps) {
    const id = useId();
    const [value, setValue] = useState(suggestedName);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const userThemes = useUserThemes();

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value);
    }, []);

    const handleSelect = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        inputRef.current!.value = value;
        setValue(value);
    }, []);

    const submit = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            if (value) {
                const confirmed = await confirmOverwriteTheme(value);
                if (confirmed) {
                    dialogRef.current!.close(value);
                }
            }
        },
        [value]
    );

    return (
        <Dialog
            {...props}
            className="save-theme-dialog"
            title="Save Theme"
            onSubmit={submit}
            ref={dialogRef}
        >
            <form method="dialog">
                <p className="prompt-message">
                    <label htmlFor={id}>Name: </label>
                    <input
                        type="text"
                        id={id}
                        defaultValue={suggestedName}
                        spellCheck={false}
                        autoComplete="off"
                        autoCapitalize="off"
                        onChange={handleChange}
                        ref={inputRef}
                    />
                </p>
                <p>
                    <select onChange={handleSelect} onDoubleClick={submit} size={6}>
                        {userThemes.map(({name}) => (
                            <option value={name} key={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </p>
                <footer className="dialog-buttons">
                    <button type="button" value="#cancel">
                        Cancel
                    </button>
                    <button value={value}>Save</button>
                </footer>
            </form>
        </Dialog>
    );
}
