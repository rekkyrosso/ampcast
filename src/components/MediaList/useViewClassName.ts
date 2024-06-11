import {useState, useEffect} from 'react';
import {ListViewLayout} from 'components/ListView';

export default function useViewClassName(layout: ListViewLayout<any>): string {
    const [className, setClassName] = useState('');

    useEffect(() => {
        let clip = 0;
        if (layout.view !== 'details') {
            layout.cols.forEach((col) => {
                if (/played-at|added-at|rate/.test(col.className!)) {
                    clip = 2;
                }
                if (clip !== 2) {
                    if (/duration|track-count|play-count/.test(col.className!)) {
                        clip = 1;
                    }
                }
            });
        }
        const indexed = layout.cols.find((col) => col.id === '#') ? 'indexed' : '';
        const clipped = clip ? `clip-${clip}` : '';
        setClassName(`${indexed} ${clipped}`.trim());
    }, [layout]);

    return className;
}
