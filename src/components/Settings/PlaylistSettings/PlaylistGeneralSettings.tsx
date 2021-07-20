import useObservable from 'hooks/useObservable';
import React, {useCallback, useMemo, useRef} from 'react';
import playlistSettings, {PlaylistSettings} from 'services/playlist/playlistSettings';
import Button from 'components/Button';
import Input from 'components/Input';

export default function PlaylistGeneralSettings() {
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
        <form className="playlist-general-settings" method="dialog">
            <fieldset>
                <legend>Content</legend>
                <p>
                    <Input
                        id="playlist-allow-duplicates"
                        type="checkbox"
                        checked={settings.allowDuplicates}
                        onChange={handleChange}
                        ref={allowDuplicatesRef}
                    />
                    <label htmlFor="playlist-allow-duplicates">Allow duplicates</label>
                </p>
            </fieldset>
            <fieldset>
                <legend>Display</legend>
                <p>
                    <Input
                        id="playlist-item-numbers"
                        type="checkbox"
                        checked={settings.showLineNumbers}
                        onChange={handleChange}
                        ref={showLineNumbersRef}
                    />
                    <label htmlFor="playlist-item-numbers">Show playlist line numbers</label>
                </p>
                <p>
                    <Input
                        id="playlist-zero-pad"
                        type="checkbox"
                        checked={settings.zeroPadLineNumbers}
                        disabled={!settings.showLineNumbers}
                        onChange={handleChange}
                        ref={zeroPadLineNumbersRef}
                    />
                    <label htmlFor="playlist-zero-pad">Zero pad line numbers</label>
                </p>
                <p>
                    <Input
                        id="playlist-source-icons"
                        type="checkbox"
                        checked={settings.showSourceIcons}
                        onChange={handleChange}
                        ref={showSourceIconsRef}
                    />
                    <label htmlFor="playlist-source-icons">Show media source icons</label>
                </p>
            </fieldset>
            <footer className="dialog-buttons">
                <Button value="#cancel" onClick={handleCancel}>
                    Cancel
                </Button>
                <Button>Confirm</Button>
            </footer>
        </form>
    );
}
