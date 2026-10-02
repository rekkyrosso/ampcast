import React, {useId, useMemo} from 'react';
import preferences from 'services/preferences';
import {t} from 'services/i18n';
import DialogButtons from 'components/Dialog/DialogButtons';
import LinkBehavior from 'types/LinkBehavior';
import {browser} from 'utils';

export interface BrowsingPreferencesProps {
    onSubmit?: () => void;
}

export default function BrowsingPreferences({onSubmit}: BrowsingPreferencesProps) {
    const id = useId();
    const originalPreferences = useMemo(() => ({...preferences}), []);
    const linkBehavior = preferences.linkBehavior;

    return (
        <form className="browsing-preferences" method="dialog" onSubmit={onSubmit}>
            <fieldset>
                <legend>{t('Link behavior')}</legend>
                <p>
                    <input
                        type="radio"
                        name="link-behavior"
                        id={`${id}-link-behavior-always`}
                        value={LinkBehavior.Always}
                        defaultChecked={linkBehavior === LinkBehavior.Always}
                        onChange={() => (preferences.linkBehavior = LinkBehavior.Always)}
                    />
                    <label htmlFor={`${id}-link-behavior-always`}>Always enabled</label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="link-behavior"
                        id={`${id}-link-behavior-cmd-key`}
                        value={LinkBehavior.CmdKey}
                        defaultChecked={linkBehavior === LinkBehavior.CmdKey}
                        onChange={() => (preferences.linkBehavior = LinkBehavior.CmdKey)}
                    />
                    <label htmlFor={`${id}-link-behavior-cmd-key`}>
                        When {browser.cmdKeyStr} key pressed
                    </label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="link-behavior"
                        id={`${id}-link-behavior-cmd-key-details`}
                        value={LinkBehavior.CmdKeyDetails}
                        defaultChecked={linkBehavior === LinkBehavior.CmdKeyDetails}
                        onChange={() => (preferences.linkBehavior = LinkBehavior.CmdKeyDetails)}
                    />
                    <label htmlFor={`${id}-link-behavior-cmd-key-details`}>
                        When {browser.cmdKeyStr} key pressed (details view only)
                    </label>
                </p>
            </fieldset>
            <fieldset>
                <legend>Explicit content</legend>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-mark-explicit`}
                        defaultChecked={originalPreferences.markExplicitContent}
                        onChange={(e) => (preferences.markExplicitContent = e.target.checked)}
                    />
                    <label htmlFor={`${id}-mark-explicit`}>Visibly mark explicit content</label>
                </p>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-disable-explicit`}
                        defaultChecked={originalPreferences.disableExplicitContent}
                        onChange={(e) => (preferences.disableExplicitContent = e.target.checked)}
                    />
                    <label htmlFor={`${id}-disable-explicit`}>
                        Disable playback of explicit content
                    </label>
                </p>
            </fieldset>
            <fieldset>
                <legend>Options</legend>
                <p>
                    <label htmlFor={`${id}-albums-or-songs`}>Preferred search:</label>
                    <select
                        id={`${id}-albums-or-songs`}
                        defaultValue={preferences.albumsOrTracks}
                        onChange={(e) => (preferences.albumsOrTracks = e.target.value as any)}
                    >
                        <option value="albums">Albums</option>
                        <option value="tracks">Songs</option>
                    </select>
                </p>
            </fieldset>
            {/* <fieldset>
                <legend>Media Info</legend>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-media-info-tabs`}
                        defaultChecked={originalPreferences.mediaInfoTabs}
                        onChange={(e) => (preferences.mediaInfoTabs = e.target.checked)}
                    />
                    <label htmlFor={`${id}-media-info-tabs`}>Show &quot;Details&quot; panel</label>
                </p>
            </fieldset> */}
            <DialogButtons />
        </form>
    );
}
