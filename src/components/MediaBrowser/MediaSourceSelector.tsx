import React, {useCallback, useEffect, useId, useMemo, useState} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import usePreferences from 'hooks/usePreferences';
import MenuButton from './MenuButton';
import './MediaSourceSelector.scss';

export interface MediaSourceSelectorProps<T extends MediaObject> {
    sources: readonly MediaSource<T>[];
    menuButtonSource?: MediaSource<T>;
    onSourceChange?: (source: MediaSource<T>) => void;
}

export default function MediaSourceSelector<T extends MediaObject>({
    sources,
    menuButtonSource,
    onSourceChange,
}: MediaSourceSelectorProps<T>) {
    const id = useId();
    const {albumsOrTracks} = usePreferences();
    const sortedSources = useMemo(() => {
        if (albumsOrTracks === 'albums') {
            const albums = sources.find((source) => source.itemType === ItemType.Album);
            if (albums) {
                return [albums, ...sources.filter((source) => source !== albums)];
            }
        }
        return sources;
    }, [sources, albumsOrTracks]);
    const [selectedSource, setSelectedSource] = useState(sortedSources[0]);

    useEffect(() => {
        onSourceChange?.(selectedSource);
    }, [selectedSource, onSourceChange]);

    const handleSourceChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const index = Number(event.target!.value);
            setSelectedSource(sortedSources[index]);
        },
        [sortedSources]
    );

    return (
        <div className="media-source-selector options">
            <ul className="media-sources">
                {sortedSources.map((source, index) => (
                    <li className="media-source" key={source.id}>
                        <input
                            id={`${id}-${source.id}`}
                            type="radio"
                            name={id}
                            value={index}
                            defaultChecked={index === 0}
                            onChange={handleSourceChange}
                        />
                        <label htmlFor={`${id}-${source.id}`}>{source.title}</label>
                    </li>
                ))}
            </ul>
            {menuButtonSource ? <MenuButton source={menuButtonSource} /> : null}
        </div>
    );
}
