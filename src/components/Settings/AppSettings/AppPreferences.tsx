import React, {useCallback, useId, useRef} from 'react';
import {browser} from 'utils';
import preferences from 'services/preferences';
import DialogButtons from 'components/Dialog/DialogButtons';

export default function AppPreferences() {
    const miniPlayerRef = useRef<HTMLInputElement>(null);
    const spacebarToggleRef = useRef<HTMLInputElement>(null);
    const id = useId();

    const handleSubmit = useCallback(() => {
        preferences.miniPlayer = !!miniPlayerRef.current?.checked;
        preferences.spacebarToggle = spacebarToggleRef.current!.checked;
    }, []);

    return (
        <form className="app-preferences" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>Playback</legend>
                <p>
                    <input
                        type="checkbox"
                        id={`${id}-spacebar-toggle`}
                        defaultChecked={preferences.spacebarToggle}
                        ref={spacebarToggleRef}
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
                            defaultChecked={preferences.miniPlayer}
                            ref={miniPlayerRef}
                        />
                        <label htmlFor={`${id}-mini-player`}>Enable popout playback window</label>
                    </p>
                )}
            </fieldset>
            <DialogButtons />
        </form>
    );
}
