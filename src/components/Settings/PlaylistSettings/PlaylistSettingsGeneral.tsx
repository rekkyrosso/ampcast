import React, {useCallback, useId, useMemo, useRef} from 'react';
import playlistSettings, {PlaylistSettings} from 'services/playlist/playlistSettings';
import DialogButtons from 'components/Dialog/DialogButtons';
import useObservable from 'hooks/useObservable';

export default function PlaylistSettingsGeneral() {
    const id = useId();
    const originalSettings: PlaylistSettings = useMemo(() => playlistSettings.get(), []);
    const settings = useObservable(playlistSettings.observe, originalSettings);
    const allowDuplicatesRef = useRef<HTMLInputElement>(null);
    const showLineNumbersRef = useRef<HTMLInputElement>(null);
    const zeroPadLineNumbersRef = useRef<HTMLInputElement>(null);
    const showSourceIconsRef = useRef<HTMLInputElement>(null);

    const handleCancel = useCallback(() => {
        playlistSettings.set(originalSettings);
    }, [originalSettings]);

    const handleChange = useCallback(() => {
        playlistSettings.set({
            allowDuplicates: allowDuplicatesRef.current!.checked,
            showLineNumbers: showLineNumbersRef.current!.checked,
            zeroPadLineNumbers: zeroPadLineNumbersRef.current!.checked,
            showSourceIcons: showSourceIconsRef.current!.checked,
        });
    }, []);

    return (
        <form className="playlist-settings-general" method="dialog">
            <fieldset>
                <legend>Content</legend>
                <p>
                    <input
                        id={`${id}-allow-duplicates`}
                        type="checkbox"
                        checked={settings.allowDuplicates}
                        onChange={handleChange}
                        ref={allowDuplicatesRef}
                    />
                    <label htmlFor={`${id}-allow-duplicates`}>Allow duplicates</label>
                </p>
            </fieldset>
            <fieldset>
                <legend>Display</legend>
                <p>
                    <input
                        id={`${id}-item-numbers`}
                        type="checkbox"
                        checked={settings.showLineNumbers}
                        onChange={handleChange}
                        ref={showLineNumbersRef}
                    />
                    <label htmlFor={`${id}-item-numbers`}>Show line numbers</label>
                </p>
                <p>
                    <input
                        id={`${id}-zero-pad`}
                        type="checkbox"
                        checked={settings.zeroPadLineNumbers}
                        disabled={!settings.showLineNumbers}
                        onChange={handleChange}
                        ref={zeroPadLineNumbersRef}
                    />
                    <label htmlFor={`${id}-zero-pad`}>Zero pad line numbers</label>
                </p>
                <p>
                    <input
                        id={`${id}-source-icons`}
                        type="checkbox"
                        checked={settings.showSourceIcons}
                        onChange={handleChange}
                        ref={showSourceIconsRef}
                    />
                    <label htmlFor={`${id}-source-icons`}>Show media service icons</label>
                </p>
            </fieldset>
            <DialogButtons onCancel={handleCancel} />
        </form>
    );
}
