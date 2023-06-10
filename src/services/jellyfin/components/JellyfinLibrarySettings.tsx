import React, {useCallback, useId, useRef} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import jellyfinSettings from '../jellyfinSettings';
import useJellyfinMusicLibraries from './useJellyfinMusicLibraries';

export default function PlexLibrarySettings() {
    const id = useId();
    const ref = useRef<HTMLSelectElement>(null);
    const preferredLibrary = jellyfinSettings.libraryId;
    const sections = useJellyfinMusicLibraries();

    const handleSubmit = useCallback(() => {
        jellyfinSettings.libraryId = ref.current!.value;
    }, []);

    return (
        <form className="plex-library-settings" method="dialog" onSubmit={handleSubmit}>
            <label htmlFor={`${id}-sections`}>Preferred Library:</label>
            <select id={`${id}-sections`} defaultValue={preferredLibrary} ref={ref}>
                {sections.map(({id, title}) => (
                    <option value={id} key={id}>
                        {title}
                    </option>
                ))}
            </select>
            <DialogButtons />
        </form>
    );
}
