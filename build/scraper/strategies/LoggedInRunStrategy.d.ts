import { RunStrategy, IRunStrategyResult } from "./RunStrategy";
import { IQuery } from "../query";
export declare const selectors: {
    container: string;
    chatPanel: string;
    jobs: string;
    links: string;
    companies: string;
    places: string;
    dates: string;
    description: string;
    detailsPanel: string;
    detailsTop: string;
    details: string;
    criteria: string;
    pagination: string;
    paginationNextBtn: string;
    paginationBtn: (index: number) => string;
};
/**
 * @class LoggedInRunStrategy
 * @extends RunStrategy
 */
export declare class LoggedInRunStrategy extends RunStrategy {
    /**
     * Check if session is authenticated
     * @param {Page} page
     * @returns {Promise<boolean>}
     * @returns {Promise<ILoadResult>}
     * @static
     * @private
     */
    private static _isAuthenticatedSession;
    /**
     * Try to load job details
     * @param {Page} page
     * @param {string} jobId
     * @param {number} timeout
     * @static
     * @private
     */
    private static _loadJobDetails;
    /**
     * Try to paginate
     * @param {Page} page
     * @param {number} paginationIndex
     * @param {number} timeout
     * @returns {Promise<ILoadResult>}
     * @static
     * @private
     */
    private static _paginate;
    /**
     * Try to paginate
     * @param {Page} page
     * @param {number} timeout
     * @param {string} tag
     * @returns {Promise<ILoadResult>}
     * @static
     * @private
     */
    private static _paginate_new;
    /**
     * Hide chat panel
     * @param {Page} page
     * @param {string} tag
     */
    private static _hideChatPanel;
    /**
     * Accept cookies
     * @param {Page} page
     * @param {string} tag
     */
    private static _acceptCookies;
    /**
     * Run strategy
     * @param page
     * @param url
     * @param query
     * @param location
     */
    run: (page: any, url: string, query: IQuery, location: string) => Promise<IRunStrategyResult>;
}
