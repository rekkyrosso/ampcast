import React, {useCallback, useRef} from 'react';
import Icon, {IconName} from 'components/Icon';
import './SearchBar.scss';

export interface SearchBarProps {
    name?: string;
    icon?: IconName;
    placeholder?: string;
    onSubmit?: (query: string) => void;
}

export default function SearchBar({name, icon, placeholder = 'Search', onSubmit}: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(
        (event: React.FormEvent) => {
            event.preventDefault();
            const query = inputRef.current!.value;
            onSubmit?.(query);
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
                    ref={inputRef}
                />
                <button type="submit" title="Search">
                    <Icon name="search" />
                </button>
            </p>
        </form>
    );
}
