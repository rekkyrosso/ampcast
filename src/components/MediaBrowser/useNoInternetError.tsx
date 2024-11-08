import {useEffect, useState} from 'react';
import MediaService from 'types/MediaService';
import {NoInternetError} from 'services/errors';
import useIsOnLine from 'hooks/useIsOnLine';

export default function useNoInternetError({
    internetRequired = false,
}: MediaService): NoInternetError | null {
    const isOnLine = useIsOnLine();
    const [noInternetError, setNoInternetError] = useState<NoInternetError | null>(() =>
        getNoInternetError(internetRequired, isOnLine, null)
    );

    useEffect(() => {
        setNoInternetError(getNoInternetError(internetRequired, isOnLine, noInternetError));
    }, [internetRequired, isOnLine, noInternetError]);

    return noInternetError;
}

function getNoInternetError(
    internetRequired: boolean,
    isOnLine: boolean,
    previousError: NoInternetError | null
) {
    return internetRequired && !isOnLine ? previousError || new NoInternetError() : null;
}
