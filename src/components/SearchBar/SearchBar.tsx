import React, {useCallback, useRef} from 'react';
import Icon from 'components/Icon';
import './SearchBar.scss';

export interface SearchBarProps {
    placeholder?: string;
    onSubmit?: (query: string) => void;
}

export default function SearchBar({placeholder = 'Search', onSubmit}: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(
        (event: React.FormEvent) => {
            const query = inputRef.current!.value;
            event.preventDefault();
            onSubmit?.(query);
        },
        [onSubmit]
    );

    return (
        <form className="search-bar" onSubmit={handleSubmit}>
            <p className="text-with-button">
                <input
                    type="search"
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
