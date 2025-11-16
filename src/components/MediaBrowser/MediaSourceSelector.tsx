import React, {useEffect, useId, useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import MenuButtons from './MenuButtons';
import './MediaSourceSelector.scss';

export interface MediaSourceSelectorProps<T extends MediaObject> {
    sources: readonly MediaSource<T>[];
    onSourceChange?: (source: MediaSource<T>) => void;
}

export default function MediaSourceSelector<T extends MediaObject>({
    sources,
    onSourceChange,
}: MediaSourceSelectorProps<T>) {
    const id = useId();
    const [selectedSource, setSelectedSource] = useState(sources[0]);

    useEffect(() => {
        onSourceChange?.(selectedSource);
    }, [selectedSource, onSourceChange]);

    return (
        <div className="media-source-selector options">
            <ul className="media-sources">
                {sources.map((source, index) => (
                    <li className="media-source" key={source.id}>
                        <input
                            id={`${id}-${source.id}`}
                            type="radio"
                            name={id}
                            value={index}
                            defaultChecked={index === 0}
                            onChange={() => setSelectedSource(source)}
                        />
                        <label htmlFor={`${id}-${source.id}`}>{source.title}</label>
                    </li>
                ))}
            </ul>
            {selectedSource ? <MenuButtons source={selectedSource} /> : null}
        </div>
    );
}
