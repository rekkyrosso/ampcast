import React, {useCallback, useRef} from 'react';
import Icon, {IconName} from 'components/Icon';
import './SearchBar.scss';

export interface SearchBarProps {
    icon?: IconName;
    placeholder?: string;
    onSubmit?: (query: string) => void;
}

export default function SearchBar({icon, placeholder = 'Search', onSubmit}: SearchBarProps) {
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
                {icon ? <Icon name={icon} /> : null}
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
