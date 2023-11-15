import React, {useCallback, useId, useRef} from 'react';
import lookupSettings from 'services/lookup/lookupSettings';
import DialogButtons from 'components/Dialog/DialogButtons';

export default function LookupSettings() {
    const ref = useRef<HTMLInputElement>(null);
    const id = useId();

    const handleSubmit = useCallback(() => {
        lookupSettings.preferPersonalMedia = ref.current!.checked;
    }, []);

    return (
        <form className="lookup-settings" method="dialog" onSubmit={handleSubmit}>
            <input
                id={`${id}-lookup-preference`}
                type="checkbox"
                defaultChecked={lookupSettings.preferPersonalMedia}
                ref={ref}
            />
            <label htmlFor={`${id}-lookup-preference`}>Prefer personal media</label>
            <div className="note">
                <p>
                    To enable playback from last.fm and ListenBrainz, Ampcast will search your
                    logged in services to find a match.
                </p>
                <p>
                    Exact matches are preferred. If you have several exact matches then the match
                    from your preferred service is used. Otherwise your last played media service is
                    used.
                </p>
            </div>
            <DialogButtons />
        </form>
    );
}
