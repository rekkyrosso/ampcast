import React, {useCallback, useId, useRef} from 'react';
import {PersonalMediaServerSettingsProps} from 'components/Settings/MediaLibrarySettings/PersonalMediaServerSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import ExternalLink from 'components/ExternalLink';
import useIsLibraryLoading from 'hooks/useIsLibraryLoading';
import useIsLoggedIn from 'hooks/useIsLoggedIn';
import ibroadcastSettings from '../ibroadcastSettings';
import ibroadcastLibrary from '../ibroadcastLibrary';

export default function IBroadcastServerSettings({
    service: ibroadcast,
}: PersonalMediaServerSettingsProps) {
    const id = useId();
    const isLoggedIn = useIsLoggedIn(ibroadcast);
    const isLibraryLoading = useIsLibraryLoading(ibroadcast);
    const bitRateRef = useRef<HTMLSelectElement>(null);

    const handleSubmit = useCallback(() => {
        ibroadcastSettings.bitRate = bitRateRef.current!.value;
    }, []);

    const reloadLibrary = useCallback(() => {
        ibroadcastLibrary.reload();
    }, []);

    return (
        <form className="personal-media-server-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Host</legend>
                <ExternalLink href={ibroadcast.host} />
            </fieldset>
            <fieldset>
                <legend>Library</legend>
                <p>
                    <button
                        type="button"
                        disabled={!isLoggedIn || isLibraryLoading}
                        onClick={reloadLibrary}
                    >
                        {isLoggedIn && isLibraryLoading ? 'Loading library…' : 'Reload library'}
                    </button>
                </p>
            </fieldset>
            <fieldset>
                <legend>Streaming</legend>
                <p>
                    <label htmlFor={`${id}-bitrate`}>Bit rate:</label>
                    <select
                        id={`${id}-bitrate`}
                        defaultValue={ibroadcastSettings.bitRate}
                        ref={bitRateRef}
                    >
                        <option value="96">96 kbps</option>
                        <option value="128">128 kbps</option>
                        <option value="192">192 kbps</option>
                        <option value="256">256 kbps</option>
                        <option value="320">320 kbps</option>
                    </select>{' '}
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
