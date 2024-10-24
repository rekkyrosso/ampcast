import React, {useCallback, useId, useRef} from 'react';
import DialogButtons from 'components/Dialog/DialogButtons';
import appleSettings from '../appleSettings';
import AppleBitrate from '../AppleBitrate';

export default function AppleAudioSettings() {
    const id = useId();
    const ref = useRef<HTMLFormElement>(null);
    const bitrate = appleSettings.bitrate;

    const handleSubmit = useCallback(() => {
        const bitrate = Number(ref.current!['apple-bitrate']?.value ?? AppleBitrate.Standard);
        if (appleSettings.bitrate !== bitrate) {
            appleSettings.bitrate = bitrate;
            const musickit = window.MusicKit?.getInstance();
            if (musickit) {
                musickit.bitrate = bitrate;
            }
        }
    }, []);

    return (
        <form
            className="apple-audio-settings"
            method="dialog"
            onSubmit={handleSubmit}
            ref={ref}
        >
            <fieldset>
                <legend>Streaming quality</legend>
                <p>
                    <input
                        type="radio"
                        name="apple-bitrate"
                        id={`${id}-standard`}
                        value={AppleBitrate.Standard}
                        defaultChecked={bitrate === AppleBitrate.Standard}
                    />
                    <label htmlFor={`${id}-standard`}>Standard (64)</label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="apple-bitrate"
                        id={`${id}-high`}
                        value={AppleBitrate.High}
                        defaultChecked={bitrate === AppleBitrate.High}
                    />
                    <label htmlFor={`${id}-high`}>High (256)</label>
                </p>
            </fieldset>
            <DialogButtons />
        </form>
    );
}
