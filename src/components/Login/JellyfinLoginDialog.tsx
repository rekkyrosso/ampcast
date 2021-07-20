import React, {useCallback, useRef} from 'react';
import jellyfinSettings from 'services/jellyfin/jellyfinSettings';
import Dialog, {showModal, DialogProps} from 'components/Dialog';
import Button from 'components/Button';
import Input from 'components/Input';

export async function showJellyfinLoginDialog(): Promise<string> {
    return showModal(JellyfinLoginDialog);
}

export default function JellyfinLoginDialog(props: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const hostRef = useRef<HTMLInputElement>(null);
    const userNameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const login = useCallback(async () => {
        try {
            const userName = userNameRef.current!.value;
            const password = passwordRef.current!.value;

            jellyfinSettings.host = hostRef.current!.value;

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

    const handleKeyDown = useCallback(
        async (event: React.KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (!event.repeat) {
                    await login();
                }
            }
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
            <form method="dialog" onKeyDown={handleKeyDown}>
                <p>
                    <label htmlFor="jellyfin-host">Host:</label>
                    <Input
                        type="url"
                        id="jellyfin-host"
                        defaultValue={jellyfinSettings.host}
                        ref={hostRef}
                    />
                </p>
                <p>
                    <label htmlFor="jellyfin-username">User:</label>
                    <Input type="text" id="jellyfin-username" autoFocus ref={userNameRef} />
                </p>
                <p>
                    <label htmlFor="jellyfin-password">Password:</label>
                    <Input type="password" id="jellyfin-password" ref={passwordRef} />
                </p>
                <footer className="dialog-buttons">
                    <Button value="#cancel">Cancel</Button>
                    <Button type="button" onClick={login}>
                        Login
                    </Button>
                </footer>
            </form>
        </Dialog>
    );
}
