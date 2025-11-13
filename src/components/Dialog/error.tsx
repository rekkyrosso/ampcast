import alert, {AlertProps} from './alert';

export default function error(err: Error): Promise<void>;
export default function error(err: string): Promise<void>;
export default function error(err: AlertProps & {system?: boolean}): Promise<void>;
export default async function error(
    err: Error | string | (AlertProps & {system?: boolean})
): Promise<void> {
    if (typeof err === 'string') {
        err = Error(err);
    }
    const {title = 'Error', message = 'Unknown error', system = true} = err as any;
    await alert({
        icon: 'error',
        title,
        message,
        system,
    });
}
