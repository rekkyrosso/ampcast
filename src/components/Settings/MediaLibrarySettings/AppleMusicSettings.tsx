import React, {useCallback, useMemo, useRef} from 'react';
import apple from 'services/apple';
import appleSettings from 'services/apple/appleSettings';
import Button from 'components/Button';
import Input from 'components/Input';
import TabList, {TabItem} from 'components/TabList';
import {MediaServiceGeneralSettings} from './MediaServiceSettings';

export default function AppleMusicSettings() {
    const tabs: TabItem[] = useMemo(
        () => [
            {
                tab: 'General',
                panel: <MediaServiceGeneralSettings service={apple} />,
            },
            {
                tab: 'Beta',
                panel: <AppleMusicBetaSettings />,
            },
        ],
        []
    );

    return <TabList items={tabs} label={apple.title} />;
}

export function AppleMusicBetaSettings() {
    const betaRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(() => {
        appleSettings.useMusicKitBeta = betaRef.current!.checked;
    }, []);

    return (
        <form
            className="apple-beta-settings"
            method="dialog"
            onSubmit={handleSubmit}
        >
            <fieldset>
                <legend>MusicKit</legend>
                <p>
                    <Input
                        type="radio"
                        name="use-musickit"
                        id="use-musickit-stable"
                        defaultChecked={!appleSettings.useMusicKitBeta}
                    />
                    <label htmlFor="use-musickit-stable">Stable version</label>
                </p>
                <p>
                    <Input
                        type="radio"
                        name="use-musickit"
                        id="use-musickit-beta"
                        defaultChecked={appleSettings.useMusicKitBeta}
                        ref={betaRef}
                    />
                    <label htmlFor="use-musickit-beta">Beta version</label>
                </p>
            </fieldset>
            <div className="note">
                <p>MusicKit beta enables playback of music videos.</p>
                <p>
                    However, this release of MusicKit is still undergoing changes and may be
                    unstable. If you experience any problems then use the stable release.
                </p>
            </div>
            <div className="note">
                <p>You will need to refresh the page for changes to take effect.</p>
            </div>
            <footer className="dialog-buttons">
                <Button value="#cancel">Cancel</Button>
                <Button>Confirm</Button>
            </footer>
        </form>
    );
}
