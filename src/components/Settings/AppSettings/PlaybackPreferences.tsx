import React, {useId, useMemo} from 'react';
import Action from 'types/Action';
import preferences from 'services/preferences';
import {t} from 'services/i18n';
import DialogButtons from 'components/Dialog/DialogButtons';

export interface PlaybackPreferencesProps {
    onSubmit?: () => void;
}

export default function PlaybackPreferences({onSubmit}: PlaybackPreferencesProps) {
    const id = useId();
    const originalPreferences = useMemo(() => ({...preferences}), []);

    return (
        <form className="playback-preferences" method="dialog" onSubmit={onSubmit}>
            <fieldset>
                <legend>Options</legend>
                <p>
                    <label htmlFor={`${id}-double-click`}>{t('Double-click behavior:')}</label>
                    <select
                        id={`${id}-double-click`}
                        defaultValue={preferences.doubleClickBehavior}
                        onChange={(e) => (preferences.doubleClickBehavior = e.target.value as any)}
                    >
                        <option value={Action.PlayNow}>Play now</option>
                        <option value={Action.PlayNext}>Play next</option>
                        <option value={Action.Queue}>Queue</option>
                    </select>
                </p>
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
            </fieldset>
            <DialogButtons />
        </form>
    );
}
