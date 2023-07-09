import React, {useCallback, useId, useRef} from 'react';
import MediaService from 'types/MediaService';
import DialogButtons from 'components/Dialog/DialogButtons';
import useEmbyMusicLibraries from './useEmbyMusicLibraries';
import {EmbySettings} from '../embySettings';

export interface EmbyLibrarySettings {
    service: MediaService;
    settings: EmbySettings;
}

export default function EmbyLibrarySettings({service, settings}: EmbyLibrarySettings) {
    const id = useId();
    const ref = useRef<HTMLSelectElement>(null);
    const preferredLibrary = settings.libraryId;
    const libraries = useEmbyMusicLibraries(service, settings);

    const handleSubmit = useCallback(() => {
        settings.libraryId = ref.current!.value;
    }, [settings]);

    return (
        <form className="emby-library-settings" method="dialog" onSubmit={handleSubmit}>
            <label htmlFor={`${id}-libraries`}>Preferred Library:</label>
            <select id={`${id}-libraries`} defaultValue={preferredLibrary} ref={ref}>
                {libraries.map(({id, title}) => (
                    <option value={id} key={id}>
                        {title}
                    </option>
                ))}
            </select>
            <DialogButtons />
        </form>
    );
}
