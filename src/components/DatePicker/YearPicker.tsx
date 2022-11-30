import React, {useCallback, useEffect, useLayoutEffect, useState} from 'react';
import {DatePickerProps} from './DatePicker';
import './YearPicker.scss';

export default function YearPicker({
    min = '1970',
    max = getMaxYear(),
    value = max,
    onSelect,
}: DatePickerProps) {
    const [year, setYear] = useState(() => String(new Date(value).getFullYear()));
    const years = useYears(min, max);

    useEffect(() => {
        onSelect?.(year);
    }, [onSelect, year]);

    const handleYearChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setYear(event.target.value);
    }, []);

    return (
        <span className="year-picker">
            <select defaultValue={year} onChange={handleYearChange}>
                {years.map((year) => (
                    <option value={year} key={year}>
                        {year}
                    </option>
                ))}
            </select>
        </span>
    );
}

function useYears(min: number | string, max: number | string): number[] {
    const [years, setYears] = useState<number[]>([]);

    useLayoutEffect(() => {
        const years: number[] = [];
        const minDate = new Date(min);
        const maxDate = new Date(max);
        const minYear = minDate.getFullYear();
        let year = maxDate.getFullYear();
        while (year >= minYear) {
            years.push(year);
            year--;
        }
        setYears(years);
    }, [min, max]);

    return years;
}

function getMaxYear(): string {
    const today = new Date();
    return String(today.getFullYear());
}
