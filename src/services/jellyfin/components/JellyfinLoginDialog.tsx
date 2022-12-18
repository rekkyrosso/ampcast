import React, {useCallback, useRef} from 'react';
import Dialog, {showDialog, DialogProps} from 'components/Dialog';
import Button from 'components/Button';
import Input from 'components/Input';
import jellyfinSettings from '../jellyfinSettings';
import './JellyfinLoginDialog.scss';

export async function showJellyfinLoginDialog(): Promise<string> {
    return showDialog(JellyfinLoginDialog, true);
}

export default function JellyfinLoginDialog(props: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const hostRef = useRef<HTMLInputElement>(null);
    const userNameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);

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
            const userId = auth.User.Id;
            const token = auth.AccessToken;

            dialogRef.current!.close(JSON.stringify({userId, token}));
        } catch (err) {
            console.error(err); // TODO: Show error in the UI
        }
    }, []);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) {
                submitRef.current!.click(); // forces form validation
            }
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
            title="Login to Jellyfin"
            ref={dialogRef}
        >
            <form method="dialog" onKeyDown={handleKeyDown} onSubmit={handleSubmit}>
                <div className="table-layout">
                    <p>
                        <label htmlFor="jellyfin-host">Host:</label>
                        <Input
                            type="url"
                            id="jellyfin-host"
                            defaultValue={jellyfinSettings.host}
                            placeholder="https://"
                            ref={hostRef}
                            required
                        />
                    </p>
                    <p>
                        <label htmlFor="jellyfin-username">User:</label>
                        <Input
                            type="text"
                            id="jellyfin-username"
                            autoFocus
                            ref={userNameRef}
                            required
                        />
                    </p>
                    <p>
                        <label htmlFor="jellyfin-password">Password:</label>
                        <Input type="password" id="jellyfin-password" ref={passwordRef} required />
                    </p>
                </div>
                <footer className="dialog-buttons">
                    <Button value="#cancel">Cancel</Button>
                    <Button ref={submitRef}>Login</Button>
                </footer>
            </form>
        </Dialog>
    );
}
