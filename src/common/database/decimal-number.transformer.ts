import { ValueTransformer } from 'typeorm';

export const decimalNumberTransformer: ValueTransformer = {
    to(value: number | null): number | null {
        return value;
    },

    from(value: string | null): number | null {
        if (value === null) {
            return null;
        }

        return Number(value);
    },
};