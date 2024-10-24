import React from 'react';
import {PersonalMediaServerSettingsProps} from 'components/Settings/MediaLibrarySettings/PersonalMediaServerSettings';
import PersonalMediaServerInfo from 'components/Settings/MediaLibrarySettings/PersonalMediaServerInfo';
import DialogButtons from 'components/Dialog/DialogButtons';
import ExternalLink from 'components/ExternalLink';

export default function NavidromeServerSettings({
    service: navidrome,
}: PersonalMediaServerSettingsProps) {
    return (
        <form className="personal-media-server-settings" method="dialog">
            <fieldset>
                <legend>Host</legend>
                {navidrome.host ? <ExternalLink href={navidrome.host} /> : 'Not configured'}
            </fieldset>
            <PersonalMediaServerInfo service={navidrome} />
            <DialogButtons />
        </form>
    );
}
