import React, {useCallback, useEffect, useId, useMemo, useRef} from 'react';
import {browser} from 'utils';
import preferences from 'services/preferences';
import DialogButtons from 'components/Dialog/DialogButtons';

export default function AppPreferences() {
    const id = useId();
    const submitted = useRef(false);
    const originalPreferences = useMemo(() => ({...preferences}), []);

    const handleSubmit = useCallback(() => {
        submitted.current = true;
    }, []);

    useEffect(() => {
        return () => {
            if (!submitted.current) {
                Object.assign(preferences, originalPreferences);
            }
        };
    }, [originalPreferences]);

    return (
        <form className="app-preferences" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Playback</legend>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-spacebar-toggle`}
                        defaultChecked={originalPreferences.spacebarTogglePlay}
                        onChange={(e) => (preferences.spacebarTogglePlay = e.target.checked)}
                    />
                    <label htmlFor={`${id}-spacebar-toggle`}>
                        Use <kbd>spacebar</kbd> to toggle play/pause
                    </label>
                </p>
                {browser.isElectron ? null : (
                    <p>
                        <input
                            type="checkbox"
                            id={`${id}-mini-player`}
                            defaultChecked={originalPreferences.miniPlayer}
                            onChange={(e) => (preferences.miniPlayer = e.target.checked)}
                        />
                        <label htmlFor={`${id}-mini-player`}>
                            Enable popout playback window (experimental)
                        </label>
                    </p>
                )}
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
                <legend>Media info</legend>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-media-info-tabs`}
                        defaultChecked={originalPreferences.mediaInfoTabs}
                        onChange={(e) => (preferences.mediaInfoTabs = e.target.checked)}
                    />
                    <label htmlFor={`${id}-media-info-tabs`}>Show &quot;Details&quot; panel</label>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
