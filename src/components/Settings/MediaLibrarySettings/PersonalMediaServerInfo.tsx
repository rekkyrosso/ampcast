import React, {useId} from 'react';
import useIsLoggedIn from 'hooks/useIsLoggedIn';
import {PersonalMediaServerSettingsProps} from './PersonalMediaServerSettings';
import useServerInfo from './useServerInfo';
import './PersonalMediaServerInfo.scss';

export default function PersonalMediaServerInfo({service}: PersonalMediaServerSettingsProps) {
    const id = useId();
    const isLoggedIn = useIsLoggedIn(service);
    const info = useServerInfo(service);

    return service.getServerInfo ? (
        <fieldset className="personal-media-server-info">
            <legend>Server Info</legend>
            {isLoggedIn ? (
                <div className="table-layout">
                    {Object.keys(info).map((key, index) => (
                        <p key={key}>
                            <label htmlFor={`${id}-${index}`}>{key}:</label>
                            <input type="text" id={`${id}-${index}`} value={info[key]} readOnly />
                        </p>
                    ))}
                </div>
            ) : (
                <p>Not available</p>
            )}
        </fieldset>
    ) : null;
}
