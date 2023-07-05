import React, {useCallback, useId, useRef} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import plexSettings from '../plexSettings';
import usePlexMusicLibraries from './usePlexMusicLibraries';

export default function PlexLibrarySettings() {
    const id = useId();
    const ref = useRef<HTMLSelectElement>(null);
    const preferredLibrary = plexSettings.libraryId;
    const libraries = usePlexMusicLibraries();

    const handleSubmit = useCallback(() => {
        plexSettings.libraryId = ref.current!.value;
    }, []);

    return (
        <form className="plex-library-settings" method="dialog" onSubmit={handleSubmit}>
            <label htmlFor={`${id}-libraries`}>Preferred Library:</label>
            <select id={`${id}-libraries`} defaultValue={preferredLibrary} ref={ref}>
                {libraries.map(({key, title}) => (
                    <option value={key} key={key}>
                        {title}
                    </option>
                ))}
            </select>
            <DialogButtons />
        </form>
    );
}
