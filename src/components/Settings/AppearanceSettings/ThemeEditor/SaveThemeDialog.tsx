import React, {useCallback, useId, useMemo, useRef, useState} from 'react';
import Theme from 'types/Theme';
import Dialog, {DialogProps} from 'components/Dialog';
import ListBox from 'components/ListView/ListBox';
import DialogButtons from 'components/Dialog/DialogButtons';
import useUserThemes from '../useUserThemes';
import confirmOverwriteTheme from '../confirmOverwriteTheme';
import './SaveThemeDialog.scss';

export interface SaveThemeDialogProps extends DialogProps {
    suggestedName: string;
}

export default function SaveThemeDialog({suggestedName, ...props}: SaveThemeDialogProps) {
    const id = useId();
    const renderTheme = useMemo(() => (theme: Theme) => theme.name, []);
    const [value, setValue] = useState(suggestedName);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const userThemes = useUserThemes();

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value);
    }, []);

    const handleSelect = useCallback(([theme]: readonly Theme[]) => {
        if (theme) {
            inputRef.current!.value = theme.name;
            setValue(theme.name);
        }
    }, []);

    const submit = useCallback(async () => {
        if (value) {
            const confirmed = await confirmOverwriteTheme(value);
            if (confirmed) {
                dialogRef.current!.close(value);
            }
        }
    }, [value]);

    const handleSubmitClick = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            await submit();
        },
        [submit]
    );

    return (
        <Dialog
            {...props}
            className="save-theme-dialog"
            icon="palette"
            title="Save Theme"
            onSubmit={handleSubmitClick}
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
                <ListBox<Theme>
                    title="My themes"
                    items={userThemes}
                    itemKey="name"
                    renderItem={renderTheme}
                    selectedIndex={-1}
                    onDoubleClick={submit}
                    onSelect={handleSelect}
                />
                <DialogButtons value={value} submitText="Save" />
            </form>
        </Dialog>
    );
}
