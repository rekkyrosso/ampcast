import {useState, useEffect} from 'react';
import {ListViewLayout} from 'components/ListView';

export default function useViewClassName(layout: ListViewLayout<any>): string {
    const [className, setClassName] = useState('');

    useEffect(() => {
        let clip = 0;
        if (layout.view !== 'details') {
            layout.cols.forEach((col) => {
                const className = col.className || '';
                if (/\bdata\b/.test(className)) {
                    if (/\b(date|rate)\b/.test(className)) {
                        clip = 2;
                    }
                    if (clip !== 2) {
                        if (/\b(count|duration)\b/.test(className)) {
                            clip = 1;
                        }
                    }
                }
            });
        }
        const indexed = layout.cols[0].className === 'indexed';
        const clipped = clip ? `clip-${clip}` : '';
        setClassName(`${indexed} ${clipped}`.trim());
    }, [layout]);

    return className;
}
