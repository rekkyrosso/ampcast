import alert, {AlertOptions} from './alert';

export default function error(err: Error): Promise<void>;
export default function error(err: string): Promise<void>;
export default function error(err: AlertOptions & {system?: boolean}): Promise<void>;
export default async function error(
    err: Error | string | (AlertOptions & {system?: boolean})
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
