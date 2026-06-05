import React, {useCallback, useRef} from 'react';
import {preventDefault} from 'utils';
import Button from 'components/Button';
import Icon, {IconName} from 'components/Icon';
import './SearchBar.scss';

export interface SearchBarProps {
    name?: string;
    icon?: IconName;
    placeholder?: string;
    onChange?: (text: string) => void;
    onSubmit: (query: string) => void;
}

export default function SearchBar({
    name,
    icon,
    placeholder = 'Search',
    onChange,
    onSubmit,
}: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const clear = useCallback(() => {
        const input = inputRef.current!;
        input.value = '';
        input.focus();
        onChange?.('');
    }, [onChange]);

    const handleInput = useCallback(() => {
        onChange?.(inputRef.current!.value);
    }, [onChange]);

    const handleSubmit = useCallback(
        (event: React.SubmitEvent) => {
            event.preventDefault();
            onSubmit(inputRef.current!.value);
        },
        [onSubmit]
    );

    return (
        <form className="search-bar" onSubmit={handleSubmit}>
            <p className="text-with-button">
                {icon ? <Icon name={icon} /> : null}
                <input
                    type="search"
                    name={name}
                    placeholder={placeholder}
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="off"
                    onInput={handleInput}
                    ref={inputRef}
                />
                <Button
                    type="button"
                    title="Clear"
                    tabIndex={-1}
                    onClick={clear}
                    onMouseDown={preventDefault}
                >
                    <Icon name="clear" />
                </Button>
                <Button type="submit" title="Search">
                    <Icon name="search" />
                </Button>
            </p>
        </form>
    );
}
