"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedinScraper = void 0;
const deepmerge_1 = __importDefault(require("deepmerge"));
const config_1 = require("../config");
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const events_1 = require("./events");
const states_1 = require("./states");
const defaults_1 = require("./defaults");
const utils_1 = require("../utils/utils");
const url_1 = require("../utils/url");
const constants_1 = require("./constants");
const query_1 = require("./query");
const browser_1 = require("../utils/browser");
const Scraper_1 = require("./Scraper");
const strategies_1 = require("./strategies");
const logger_1 = require("../logger/logger");
puppeteer_extra_1.default.use(require('puppeteer-extra-plugin-stealth')());
/**
 * Main class
 * @extends EventEmitter
 * @param options {ScraperOptions} Puppeteer browser options, for more informations see https://pptr.dev/#?product=Puppeteer&version=v2.0.0&show=api-puppeteerlaunchoptions
 * @constructor
 */
class LinkedinScraper extends Scraper_1.Scraper {
    /**
     * @constructor
     * @param {ScraperOptions} options
     */
    constructor(options) {
        super(options);
        this._browser = undefined;
        this._context = undefined;
        this._state = states_1.states.notInitialized;
        /**
         * Build jobs search url
         * @param {string} query
         * @param {string} location
         * @param {IQueryOptions} options
         * @returns {string}
         * @private
         */
        this._buildSearchUrl = (query, location, options) => {
            const url = new URL(constants_1.urls.jobsSearch);
            if (query && query.length) {
                url.searchParams.append("keywords", query);
            }
            if (location && location.length) {
                url.searchParams.append("location", location);
            }
            if (options && options.filters) {
                if (options.filters.companyJobsUrl) {
                    const queryParams = url_1.getQueryParams(options.filters.companyJobsUrl);
                    url.searchParams.append("f_C", queryParams["f_C"]);
                }
                if (options.filters.relevance) {
                    url.searchParams.append("sortBy", options.filters.relevance);
                }
                if (options.filters.time && options.filters.time.length) {
                    url.searchParams.append("f_TPR", options.filters.time);
                }
                if (options.filters.type) {
                    if (!Array.isArray(options.filters.type)) {
                        options.filters.type = [options.filters.type];
                    }
                    url.searchParams.append("f_JT", options.filters.type.join(","));
                }
                if (options.filters.experience) {
                    if (!Array.isArray(options.filters.experience)) {
                        options.filters.experience = [options.filters.experience];
                    }
                    url.searchParams.append("f_E", options.filters.experience.join(","));
                }
                if (options.filters.remote && config_1.config.LI_AT_COOKIE) {
                    url.searchParams.append("f_WRA", options.filters.remote);
                }
            }
            url.searchParams.append("start", "0");
            return url.href;
        };
        /**
         * Scrape linkedin jobs
         * @param {IQuery | IQuery[]} queries
         * @param {IQueryOptions} [options]
         * @return {Promise<void>}
         * @private
         */
        this._run = (queries, options) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            let tag;
            if (!Array.isArray(queries)) {
                queries = [queries];
            }
            // Merge options and validate
            for (const query of queries) {
                const optionsToMerge = [defaults_1.queryOptionsDefault];
                options && optionsToMerge.push(options);
                query.options && optionsToMerge.push(query.options);
                query.options = deepmerge_1.default.all(optionsToMerge);
                // Add default location if none provided
                if (!((_b = (_a = query === null || query === void 0 ? void 0 : query.options) === null || _a === void 0 ? void 0 : _a.locations) === null || _b === void 0 ? void 0 : _b.length)) {
                    query.options.locations = ["Worldwide"];
                }
                const errors = query_1.validateQuery(query);
                if (errors.length) {
                    logger_1.logger.error(errors);
                    process.exit(1);
                }
            }
            // Initialize browser
            if (!this._browser) {
                yield this._initialize();
            }
            // Queries loop
            for (const query of queries) {
                // Locations loop
                for (const location of query.options.locations) {
                    tag = `[${query.query}][${location}]`;
                    logger_1.logger.info(tag, `Starting new query:`, `query="${query.query}"`, `location="${location}"`);
                    logger_1.logger.info(tag, `Query options`, query.options);
                    // Open new page in incognito context
                    const page = yield this._context.newPage();
                    // Create Chrome Developer Tools session
                    const session = yield page.target().createCDPSession();
                    // Disable Content Security Policy: needed for pagination to work properly in anonymous mode
                    yield page.setBypassCSP(true);
                    // Tricks to speed up page
                    yield session.send('Page.enable');
                    yield session.send('Page.setWebLifecycleState', {
                        state: 'active',
                    });
                    // Set a random user agent
                    yield page.setUserAgent(browser_1.getRandomUserAgent());
                    // Enable request interception
                    yield page.setRequestInterception(true);
                    const onRequest = (request) => __awaiter(this, void 0, void 0, function* () {
                        const url = new URL(request.url());
                        const domain = url.hostname.split(".").slice(-2).join(".").toLowerCase();
                        // Block tracking and 3rd party requests
                        if (url.pathname.includes("li/track") || !["linkedin.com", "licdn.com"].includes(domain)) {
                            return request.abort();
                        }
                        // It optimization is enabled, block other resource types
                        if (query.options.optimize) {
                            const resourcesToBlock = [
                                "image",
                                "stylesheet",
                                "media",
                                "font",
                                "texttrack",
                                "object",
                                "beacon",
                                "csp_report",
                                "imageset",
                            ];
                            if (resourcesToBlock.some(r => request.resourceType() === r)
                                || request.url().includes(".jpg")
                                || request.url().includes(".jpeg")
                                || request.url().includes(".png")
                                || request.url().includes(".gif")
                                || request.url().includes(".css")) {
                                return request.abort();
                            }
                        }
                        request.continue();
                    });
                    // Add listener
                    page.on("request", onRequest);
                    // Error response and rate limiting check
                    page.on("response", response => {
                        if (response.status() === 429) {
                            logger_1.logger.warn(tag, "Error 429 too many requests. You would probably need to use a higher 'slowMo' value and/or reduce the number of concurrent queries.");
                        }
                        else if (response.status() >= 400) {
                            logger_1.logger.warn(tag, response.status(), `Error for request ${response.request().url()}`);
                        }
                    });
                    // Build search url
                    const searchUrl = this._buildSearchUrl(query.query || "", location, query.options);
                    // Run strategy
                    const runStrategyResult = yield this._runStrategy.run(page, searchUrl, query, location);
                    // Check if forced exit is required
                    if (runStrategyResult.exit) {
                        logger_1.logger.warn(tag, "Forced termination");
                        return;
                    }
                    // Close page
                    page && (yield page.close());
                }
            }
            // Emit end event
            this.emit(events_1.events.scraper.end);
        });
        /**
         * Scrape linkedin jobs
         * @param {IQuery | IQuery[]} queries
         * @param {IQueryOptions} [options]
         * @return {Promise<void>}
         */
        this.run = (queries, options) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._state === states_1.states.notInitialized) {
                    yield this._initialize();
                }
                else if (this._state === states_1.states.initializing) {
                    const timeout = 10000;
                    const pollingTime = 100;
                    let elapsed = 0;
                    while (this._state !== states_1.states.initialized) {
                        yield utils_1.sleep(pollingTime);
                        elapsed += pollingTime;
                        if (elapsed >= timeout) {
                            throw new Error(`Initialize timeout exceeded: ${timeout}ms`);
                        }
                    }
                }
                yield this._run(queries, options);
            }
            catch (err) {
                logger_1.logger.error(err);
                this.emit(events_1.events.scraper.error, err);
            }
        });
        /**
         * Close browser instance
         * @returns {Promise<void>}
         */
        this.close = () => __awaiter(this, void 0, void 0, function* () {
            try {
                if (this._browser) {
                    this._browser.removeAllListeners() && (yield this._browser.close());
                }
            }
            finally {
                this._browser = undefined;
                this._state = states_1.states.notInitialized;
            }
        });
        if (config_1.config.LI_AT_COOKIE) {
            this._runStrategy = new strategies_1.LoggedInRunStrategy(this);
            logger_1.logger.info(`Env variable LI_AT_COOKIE detected. Using ${strategies_1.LoggedInRunStrategy.name}`);
        }
        else {
            this._runStrategy = new strategies_1.LoggedOutRunStrategy(this);
            logger_1.logger.info(`Using ${strategies_1.LoggedOutRunStrategy.name}`);
        }
    }
    /**
     * Initialize browser
     * @private
     */
    _initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this._state = states_1.states.initializing;
            this._browser && this._browser.removeAllListeners();
            const launchOptions = deepmerge_1.default.all([defaults_1.browserDefaults, this.options]);
            logger_1.logger.info('Setting chrome launch options', launchOptions);
            this._browser = yield puppeteer_extra_1.default.launch(launchOptions);
            // Close initial browser page
            yield (yield this._browser.pages())[0].close();
            this._context = yield this._browser.createIncognitoBrowserContext();
            this._browser.on(events_1.events.puppeteer.browser.disconnected, () => {
                this.emit(events_1.events.puppeteer.browser.disconnected);
            });
            this._browser.on(events_1.events.puppeteer.browser.targetcreated, () => {
                this.emit(events_1.events.puppeteer.browser.targetcreated);
            });
            this._browser.on(events_1.events.puppeteer.browser.targetchanged, () => {
                this.emit(events_1.events.puppeteer.browser.targetchanged);
            });
            this._browser.on(events_1.events.puppeteer.browser.targetdestroyed, () => {
                this.emit(events_1.events.puppeteer.browser.targetdestroyed);
            });
            this._state = states_1.states.initialized;
        });
    }
}
exports.LinkedinScraper = LinkedinScraper;
