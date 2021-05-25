export interface IQuery {
    query?: string;
    options?: IQueryOptions;
}
export interface IQueryOptions {
    locations?: string[];
    limit?: number;
    filters?: {
        companyJobsUrl?: string;
        relevance?: string;
        time?: string;
        type?: string | string[];
        experience?: string | string[];
        remote?: string;
    };
    descriptionFn?: () => string;
    optimize?: boolean;
}
export interface IQueryValidationError {
    param: string;
    reason: string;
}
/**
 * Validate query
 * @param {IQuery} query
 * @returns {IQueryValidationError[]}
 */
export declare const validateQuery: (query: IQuery) => IQueryValidationError[];
