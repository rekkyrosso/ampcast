import {useMemo} from 'react';
import MediaListLayout from 'types/MediaListLayout';

export default function useIconTitle(
    layoutOptions: Partial<MediaListLayout> | undefined
): Partial<MediaListLayout> | undefined {
    return useMemo(() => {
        if (layoutOptions?.card && layoutOptions.card.h1 !== 'IconTitle') {
            const options = structuredClone(layoutOptions);
            (options.card as any).h1 = 'IconTitle';
            return options;
        }
        return layoutOptions;
    }, [layoutOptions]);
}
