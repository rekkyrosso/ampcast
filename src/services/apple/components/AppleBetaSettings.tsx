import React, {useCallback, useId, useRef} from 'react';
import {confirm} from 'components/Dialog';
import DialogButtons from 'components/Dialog/DialogButtons';
import apple from '../apple';
import appleSettings from '../appleSettings';

export default function AppleBetaSettings() {
    const id = useId();
    const betaRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(async () => {
        const useMusicKitBeta = betaRef.current!.checked;
        if (appleSettings.useMusicKitBeta !== useMusicKitBeta) {
            const confirmed = await confirm({
                message: `Switch to the ${useMusicKitBeta ? 'beta' : 'stable'} version?`,
                okLabel: 'Switch version',
                system: true,
            });

            if (confirmed) {
                appleSettings.useMusicKitBeta = useMusicKitBeta;
                await apple.logout();
                location.reload();
            }
        }
    }, []);

    return (
        <form className="apple-beta-settings" method="dialog" onSubmit={handleSubmit}>
            <fieldset>
                <legend>MusicKit*</legend>
                <p>
                    <input
                        type="radio"
                        name="use-musickit"
                        id={`${id}-musickit-stable`}
                        defaultChecked={!appleSettings.useMusicKitBeta}
                    />
                    <label htmlFor={`${id}-musickit-stable`}>Stable version</label>
                </p>
                <p>
                    <input
                        type="radio"
                        name="use-musickit"
                        id={`${id}-musickit-beta`}
                        defaultChecked={appleSettings.useMusicKitBeta}
                        ref={betaRef}
                    />
                    <label htmlFor={`${id}-musickit-beta`}>Beta version (recommended)</label>
                </p>
            </fieldset>
            <div className="note">
                <p>MusicKit beta enables playback of music videos.</p>
                <p>
                    However, this release of MusicKit is still undergoing changes and may be
                    unstable. If you experience any problems then use the stable release.
                </p>
                <p>
                    You will need to reload the page for changes to take effect. And you will need
                    to log in again.
                </p>
            </div>
            <p>
                <small>
                    *MusicKit is a JavaScript library supplied by Apple that provides access to
                    Apple Music services and media playback.
                </small>
            </p>
            <DialogButtons />
        </form>
    );
}
