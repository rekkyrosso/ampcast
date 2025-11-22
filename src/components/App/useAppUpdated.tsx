import React, {useEffect, useMemo} from 'react';
import {downloadUrl} from 'services/constants';
import {alert} from 'components/Dialog';
import ExternalLink from 'components/ExternalLink';

const versionKey = 'ampcast/installed-version';

export default function useAppUpdated(): void {
    const currentVersion = useMemo(() => localStorage.getItem(versionKey), []);

    useEffect(() => {
        localStorage.setItem(versionKey, __app_version__);
        if (currentVersion && currentVersion !== __app_version__) {
            const timerId = setTimeout(() => {
                alert({
                    icon: 'ampcast',
                    title: 'App updated',
                    message: (
                        <>
                            <p>Ampcast has been updated to version {__app_version__}.</p>
                            <p>
                                <ExternalLink
                                    style={{textDecoration: 'underline'}}
                                    href={`${downloadUrl}/tag/v${__app_version__}`}
                                >
                                    Release notes on GitHub
                                </ExternalLink>
                            </p>
                        </>
                    ),
                    system: true,
                });
            }, 1000);
            return () => clearTimeout(timerId);
        }
    }, [currentVersion]);
}
