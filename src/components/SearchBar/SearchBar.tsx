import React, {useCallback, useRef} from 'react';
import Button from 'components/Button';
import Input from 'components/Input';
import './SearchBar.scss';

export interface SearchBarProps {
    onSubmit?: (query: string) => void;
}

export default function SearchBar({onSubmit}: SearchBarProps) {
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
            <p className="search-bar-input">
                <Input
                    type="search"
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="off"
                    ref={inputRef}
                />
                <Button type="submit">Search</Button>
            </p>
        </form>
    );
}
