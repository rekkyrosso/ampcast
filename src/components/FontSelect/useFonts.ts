import {useEffect} from 'react';
import fonts, {loadAllFonts} from 'services/theme/fonts';

export default function useFonts() {
    useEffect(() => {
        loadAllFonts();
    }, []);

    return fonts;
}
