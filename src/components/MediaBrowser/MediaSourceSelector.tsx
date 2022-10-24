import React, {useCallback, useId} from 'react';
import MediaSource from 'types/MediaSource';
import Input from 'components/Input';
import './MediaSourceSelector.scss';

export interface MediaSourceSelectorProps<T> {
    sources: readonly MediaSource<T>[];
    onSourceChange?: (source: MediaSource<T>) => void;
}

export default function MediaSourceSelector<T>({sources, onSourceChange}: MediaSourceSelectorProps<T>) {
    const id = useId();

    const handleSourceChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const index = Number(event.target!.value);
            const source = sources[index];
            onSourceChange?.(source);
        },
        [sources, onSourceChange]
    );

    return (
        <form className="media-source-selector">
            <ul className="media-sources">
                {sources.map((source, index) => (
                    <li className="media-source" key={source.id}>
                        <Input
                            id={`${id}-${source.id}`}
                            type="radio"
                            name="search-type"
                            value={index}
                            defaultChecked={index === 0}
                            onChange={handleSourceChange}
                        />
                        <label htmlFor={`${id}-${source.id}`}>{source.title}</label>
                    </li>
                ))}
            </ul>
        </form>
    );
}
