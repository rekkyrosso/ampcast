import {useEffect, useState} from 'react';
import theme from 'services/theme';

export default function useBaseFontSize(): number {
    const [fontSize, setFontSize] = useState(theme.fontSize);

    useEffect(() => {
        const subscription = theme.observeFontSize().subscribe(setFontSize);
        return () => subscription.unsubscribe();
    }, []);

    return fontSize;
}
