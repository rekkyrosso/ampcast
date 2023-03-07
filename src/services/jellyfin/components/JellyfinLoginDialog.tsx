import React, {useCallback, useId, useRef} from 'react';
import Dialog, {showDialog, DialogProps} from 'components/Dialog';
import jellyfinSettings from '../jellyfinSettings';
import './JellyfinLoginDialog.scss';

export async function showJellyfinLoginDialog(): Promise<string> {
    return showDialog(JellyfinLoginDialog, true);
}

export default function JellyfinLoginDialog(props: DialogProps) {
    const id = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const hostRef = useRef<HTMLInputElement>(null);
    const userNameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const login = useCallback(async () => {
        try {
            const userName = userNameRef.current!.value;
            const password = passwordRef.current!.value;

            jellyfinSettings.host = hostRef.current!.value.replace(/\/+$/, '');

            const {device, deviceId} = jellyfinSettings;
            const authorization = `MediaBrowser Client="${__app_name__}", Version="${__app_version__}", Device="${device}", DeviceId="${deviceId}"`;
            const response = await fetch(`${jellyfinSettings.host}/Users/AuthenticateByName`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Emby-Authorization': authorization,
                },
                body: JSON.stringify({
                    Username: userName,
                    Pw: password,
                }),
            });

            if (!response.ok) {
                throw Error(`${response.status}: ${response.statusText}`);
            }

            const auth = await response.json();
            const serverId = auth.ServerId;
            const userId = auth.User.Id;
            const token = auth.AccessToken;

            dialogRef.current!.close(JSON.stringify({serverId, userId, token}));
        } catch (err) {
            console.error(err); // TODO: Show error in the UI
        }
    }, []);

    const handleSubmit = useCallback(
        (event: React.FormEvent) => {
            event.preventDefault();
            login();
        },
        [login]
    );

    return (
        <Dialog
            {...props}
            className="jellyfin-login-dialog"
            title="Log in to Jellyfin"
            ref={dialogRef}
        >
            <form method="dialog" onSubmit={handleSubmit}>
                <div className="table-layout">
                    <p>
                        <label htmlFor={`${id}-host`}>Host:</label>
                        <input
                            type="url"
                            id={`${id}-host`}
                            defaultValue={jellyfinSettings.host}
                            placeholder="https://"
                            ref={hostRef}
                            required
                        />
                    </p>
                    <p>
                        <label htmlFor={`${id}-username`}>User:</label>
                        <input
                            type="text"
                            id={`${id}-username`}
                            autoFocus
                            spellCheck={false}
                            autoComplete="off"
                            autoCapitalize="off"
                            ref={userNameRef}
                            required
                        />
                    </p>
                    <p>
                        <label htmlFor={`${id}-password`}>Password:</label>
                        <input type="password" id={`${id}-password`} ref={passwordRef} required />
                    </p>
                </div>
                <footer className="dialog-buttons">
                    <button type="button" value="#cancel">
                        Cancel
                    </button>
                    <button>Login</button>
                </footer>
            </form>
        </Dialog>
    );
}
