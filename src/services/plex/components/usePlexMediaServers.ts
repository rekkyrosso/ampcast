import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import MediaService from 'types/MediaService';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import useObservable from 'hooks/useObservable';
import plexApi from '../plexApi';
import {getConnection} from '../plexAuth';
import plexSettings from '../plexSettings';

export interface PlexMediaServer {
    id: string; // `server.clientIdentifier`
    device: plex.Device;
    connection: plex.Connection | null;
    libraries: readonly PersonalMediaLibrary[];
}

export default function usePlexMediaServers(plex: MediaService) {
    const isLoggedIn = useObservable(plex.observeIsLoggedIn, false);
    const [servers, setServers] = useState<readonly PlexMediaServer[]>(() => {
        const {server, connection, libraries} = plexSettings;
        if (server) {
            const id = server.clientIdentifier;
            return [{id, device: server, connection, libraries}];
        } else {
            return [];
        }
    });

    useEffect(() => {
        if (isLoggedIn) {
            const subscription = from(getPlexMediaServers()).subscribe(setServers);
            return () => subscription.unsubscribe();
        }
    }, [isLoggedIn]);

    return servers;
}

async function getPlexMediaServers(): Promise<readonly PlexMediaServer[]> {
    const devices = await plexApi.getServers();
    return Promise.all(devices.map(getPlexMediaServer));
}

async function getPlexMediaServer(device: plex.Device): Promise<PlexMediaServer> {
    const id = device.clientIdentifier;
    if (plexSettings.serverId === id) {
        const {connection, libraries} = plexSettings;
        return {id, device, connection, libraries};
    } else {
        const connection = await getConnection(device);
        let libraries: readonly PersonalMediaLibrary[] = [];
        if (connection) {
            try {
                libraries = await plexApi.getMusicLibraries(connection.uri, device.accessToken);
            } catch (err) {
                console.error(err);
            }
        }
        return {id, device, connection, libraries};
    }
}
