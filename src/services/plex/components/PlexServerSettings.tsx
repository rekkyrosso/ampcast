import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import {PersonalMediaServerSettingsProps} from 'components/Settings/MediaLibrarySettings/PersonalMediaServerSettings';
import PersonalMediaServerInfo from 'components/Settings/MediaLibrarySettings/PersonalMediaServerInfo';
import DialogButtons from 'components/Dialog/DialogButtons';
import PlexHost from './PlexHost';
import usePlexMediaServers, {PlexMediaServer} from './usePlexMediaServers';
import plexSettings from '../plexSettings';

export default function PlexServerSettings({service: plex}: PersonalMediaServerSettingsProps) {
    const id = useId();
    const serverIdRef = useRef<HTMLSelectElement>(null);
    const libraryIdRef = useRef<HTMLSelectElement>(null);
    const servers = usePlexMediaServers(plex);
    const [server, setServer] = useState<PlexMediaServer | null>(null);
    const [libraries, setLibraries] = useState<readonly PersonalMediaLibrary[]>([]);
    const [libraryId, setLibraryId] = useState(plexSettings.libraryId);

    useEffect(() => {
        setServer(
            servers.find((server) => server.id === plexSettings.serverId) || servers[0] || null
        );
    }, [servers]);

    useEffect(() => {
        setLibraries(server?.libraries || []);
    }, [server]);

    const handleServerChange = useCallback(() => {
        setServer(servers.find((server) => server.id === serverIdRef.current!.value) || null);
    }, [servers]);

    const handleLibraryChange = useCallback(() => {
        setLibraryId(libraryIdRef.current!.value);
    }, []);

    const handleSubmit = useCallback(() => {
        if (server) {
            if (plexSettings.serverId !== server.id) {
                plexSettings.server = server.device;
                plexSettings.connection = server.connection;
                plexSettings.libraries = server.libraries;
                if (plexSettings.libraryId === libraryId) {
                    // Make sure the new value gets pushed through `observeLibraryId()`.
                    // `libraryId` is used as a key to refresh the `MediaBrowser` component.
                    // `libraryId` is not unique across servers.
                    plexSettings.libraryId = '';
                }
            }
            plexSettings.libraryId = libraryId;
        }
    }, [server, libraryId]);

    return (
        <form className="personal-media-server-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Host</legend>
                <PlexHost service={plex} />
            </fieldset>
            <PersonalMediaServerInfo service={plex} />
            <fieldset>
                <legend>Preferences</legend>
                <p>
                    <label htmlFor={`${id}-servers`}>Server:</label>
                    <select
                        id={`${id}-servers`}
                        value={server?.id}
                        onChange={handleServerChange}
                        ref={serverIdRef}
                    >
                        {servers.map(({id, device, connection}) => (
                            <option value={id} key={id}>
                                {`${device.name}${connection ? '' : ' (offline)'}`}
                            </option>
                        ))}
                    </select>
                </p>
                <p>
                    <label htmlFor={`${id}-libraries`}>Library:</label>
                    <select
                        id={`${id}-libraries`}
                        value={libraryId}
                        onChange={handleLibraryChange}
                        ref={libraryIdRef}
                        key={server?.id}
                    >
                        {libraries.map(({id, title}) => (
                            <option value={id} key={id}>
                                {title}
                            </option>
                        ))}
                    </select>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
