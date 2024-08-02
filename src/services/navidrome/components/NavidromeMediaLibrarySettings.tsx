import React from 'react';
import PersonalMediaService from 'types/PersonalMediaService';
import DialogButtons from 'components/Dialog/DialogButtons';
import ExternalLink from 'components/ExternalLink';

export interface PersonalMediaLibrarySettingsProps {
    service: PersonalMediaService;
}

export default function NavidromeMediaLibrarySettings({
    service: navidrome,
}: PersonalMediaLibrarySettingsProps) {
    return (
        <form className="personal-media-library-settings" method="dialog">
            <fieldset>
                <legend>Host</legend>
                {navidrome.host ? <ExternalLink href={navidrome.host} /> : 'Not configured'}
            </fieldset>
            <DialogButtons />
        </form>
    );
}
