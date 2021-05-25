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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggedInRunStrategy = exports.selectors = void 0;
const config_1 = require("../../config");
const RunStrategy_1 = require("./RunStrategy");
const events_1 = require("../events");
const utils_1 = require("../../utils/utils");
const logger_1 = require("../../logger/logger");
const constants_1 = require("../constants");
exports.selectors = {
    container: '.jobs-search-two-pane__container',
    chatPanel: '.msg-overlay-list-bubble',
    jobs: '.job-card-container',
    links: 'a.job-card-container__link.job-card-list__title',
    companies: '.job-card-container .artdeco-entity-lockup__subtitle',
    places: '.job-card-container .artdeco-entity-lockup__caption',
    dates: '.job-card-container time',
    description: '.jobs-description',
    detailsPanel: '.jobs-search__job-details--container',
    detailsTop: '.jobs-details-top-card',
    details: '.jobs-details__main-content',
    criteria: '.jobs-box__group h3',
    pagination: '.jobs-search-two-pane__pagination',
    paginationNextBtn: 'li[data-test-pagination-page-btn].selected + li',
    paginationBtn: (index) => `li[data-test-pagination-page-btn="${index}"] button`,
};
/**
 * @class LoggedInRunStrategy
 * @extends RunStrategy
 */
class LoggedInRunStrategy extends RunStrategy_1.RunStrategy {
    constructor() {
        super(...arguments);
        /**
         * Run strategy
         * @param page
         * @param url
         * @param query
         * @param location
         */
        this.run = (page, url, query, location) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            let tag = `[${query.query}][${location}]`;
            let processed = 0;
            let paginationIndex = 1;
            // Navigate to home page
            logger_1.logger.debug(tag, "Opening", constants_1.urls.home);
            yield page.goto(constants_1.urls.home, {
                waitUntil: 'load',
            });
            // Set cookie
            logger_1.logger.info("Setting authentication cookie");
            yield page.setCookie({
                name: "li_at",
                value: config_1.config.LI_AT_COOKIE,
                domain: ".www.linkedin.com"
            });
            logger_1.logger.info(tag, "Opening", url);
            yield page.goto(url, {
                waitUntil: 'load',
            });
            // Verify session
            if (!(yield LoggedInRunStrategy._isAuthenticatedSession(page))) {
                logger_1.logger.error("The provided session cookie is invalid. Check the documentation on how to obtain a valid session cookie.");
                this.scraper.emit(events_1.events.scraper.invalidSession);
                return { exit: true };
            }
            try {
                yield page.waitForSelector(exports.selectors.container, { timeout: 5000 });
            }
            catch (err) {
                logger_1.logger.info(tag, `No jobs found, skip`);
                return { exit: false };
            }
            // Pagination loop
            while (processed < query.options.limit) {
                // Verify session in the loop
                if (!(yield LoggedInRunStrategy._isAuthenticatedSession(page))) {
                    logger_1.logger.warn(tag, "Session is invalid, this may cause the scraper to fail.");
                    this.scraper.emit(events_1.events.scraper.invalidSession);
                }
                else {
                    logger_1.logger.info(tag, "Session is valid");
                }
                // Try to hide chat panel
                yield LoggedInRunStrategy._hideChatPanel(page, tag);
                // Accept cookies
                yield LoggedInRunStrategy._acceptCookies(page, tag);
                let jobIndex = 0;
                // Get number of all job links in the page
                let jobLinksTot = yield page.evaluate((linksSelector) => document.querySelectorAll(linksSelector).length, exports.selectors.links);
                if (jobLinksTot === 0) {
                    logger_1.logger.info(tag, `No jobs found, skip`);
                    break;
                }
                logger_1.logger.info(tag, "Jobs fetched: " + jobLinksTot);
                // Jobs loop
                while (jobIndex < jobLinksTot && processed < query.options.limit) {
                    tag = `[${query.query}][${location}][${processed + 1}]`;
                    let jobId;
                    let jobLink;
                    let jobTitle;
                    let jobCompany;
                    let jobPlace;
                    let jobDescription;
                    let jobDescriptionHTML;
                    let jobDate;
                    let jobSenorityLevel;
                    let jobFunction;
                    let jobEmploymentType;
                    let jobIndustry;
                    let loadDetailsResult;
                    try {
                        // Extract job main fields
                        logger_1.logger.debug(tag, 'Evaluating selectors', [
                            exports.selectors.links,
                            exports.selectors.companies,
                            exports.selectors.places,
                            exports.selectors.dates,
                        ]);
                        [jobId, jobTitle, jobCompany, jobPlace, jobDate] = yield page.evaluate((jobsSelector, linksSelector, companiesSelector, placesSelector, datesSelector, jobIndex) => {
                            const jobId = document.querySelectorAll(jobsSelector)[jobIndex] ?
                                document.querySelectorAll(jobsSelector)[jobIndex]
                                    .getAttribute("data-job-id") : "";
                            const title = document.querySelectorAll(linksSelector)[jobIndex] ?
                                document.querySelectorAll(linksSelector)[jobIndex].innerText : "";
                            const company = document.querySelectorAll(companiesSelector)[jobIndex] ?
                                document.querySelectorAll(companiesSelector)[jobIndex].innerText : "";
                            const place = document.querySelectorAll(placesSelector)[jobIndex] ?
                                document.querySelectorAll(placesSelector)[jobIndex].innerText : "";
                            const date = document.querySelectorAll(datesSelector)[jobIndex] ?
                                document.querySelectorAll(datesSelector)[jobIndex]
                                    .getAttribute('datetime') : "";
                            return [
                                jobId,
                                title,
                                company,
                                place,
                                date,
                            ];
                        }, exports.selectors.jobs, exports.selectors.links, exports.selectors.companies, exports.selectors.places, exports.selectors.dates, jobIndex);
                        // Try to load job details and extract job link
                        logger_1.logger.debug(tag, 'Evaluating selectors', [
                            exports.selectors.links,
                        ]);
                        [jobLink, loadDetailsResult] = yield Promise.all([
                            page.evaluate((linksSelector, jobIndex) => {
                                const linkElem = document.querySelectorAll(linksSelector)[jobIndex];
                                linkElem.scrollIntoView();
                                linkElem.click();
                                const protocol = window.location.protocol + "//";
                                const hostname = window.location.hostname;
                                return protocol + hostname + linkElem.getAttribute("href");
                            }, exports.selectors.links, jobIndex),
                            LoggedInRunStrategy._loadJobDetails(page, jobId)
                        ]);
                        // Check if loading job details has failed
                        if (!loadDetailsResult.success) {
                            logger_1.logger.error(tag, loadDetailsResult.error);
                            jobIndex += 1;
                            continue;
                        }
                        // Use custom description function if available
                        logger_1.logger.debug(tag, 'Evaluating selectors', [
                            exports.selectors.description,
                        ]);
                        if ((_a = query.options) === null || _a === void 0 ? void 0 : _a.descriptionFn) {
                            [jobDescription, jobDescriptionHTML] = yield Promise.all([
                                page.evaluate(`(${query.options.descriptionFn.toString()})();`),
                                page.evaluate((selector) => {
                                    return document.querySelector(selector).outerHTML;
                                }, exports.selectors.description)
                            ]);
                        }
                        else {
                            [jobDescription, jobDescriptionHTML] = yield page.evaluate((selector) => {
                                const el = document.querySelector(selector);
                                return [el.innerText, el.outerHTML];
                            }, exports.selectors.description);
                        }
                        jobDescription = jobDescription;
                        // Extract job criteria
                        logger_1.logger.debug(tag, 'Evaluating selectors', [
                            exports.selectors.criteria,
                        ]);
                        [
                            jobSenorityLevel,
                            jobEmploymentType,
                            jobIndustry,
                            jobFunction,
                        ] = yield page.evaluate((jobCriteriaSelector) => {
                            const nodes = document.querySelectorAll(jobCriteriaSelector);
                            const criteria = [
                                "Seniority Level",
                                "Employment Type",
                                "Industry",
                                "Job Functions",
                            ];
                            const [senoriotyLevel, employmentType, industry, jobFunctions,] = criteria.map(criteria => {
                                const el = Array.from(nodes)
                                    .find(node => node.innerText.trim() === criteria);
                                if (el && el.nextElementSibling) {
                                    const sibling = el.nextElementSibling;
                                    return sibling.innerText
                                        .replace(/[\s]{2,}/g, ", ")
                                        .replace(/[\n\r]+/g, " ")
                                        .trim();
                                }
                                else {
                                    return "";
                                }
                            });
                            return [
                                senoriotyLevel,
                                employmentType,
                                industry,
                                jobFunctions
                            ];
                        }, exports.selectors.criteria);
                    }
                    catch (err) {
                        const errorMessage = `${tag}\t${err.message}`;
                        this.scraper.emit(events_1.events.scraper.error, errorMessage);
                        jobIndex++;
                        continue;
                    }
                    // Emit data
                    this.scraper.emit(events_1.events.scraper.data, {
                        query: query.query || "",
                        location: location,
                        jobId: jobId,
                        jobIndex: jobIndex,
                        link: jobLink,
                        title: jobTitle,
                        company: jobCompany,
                        place: jobPlace,
                        description: jobDescription,
                        descriptionHTML: jobDescriptionHTML,
                        date: jobDate,
                        senorityLevel: jobSenorityLevel,
                        jobFunction: jobFunction,
                        employmentType: jobEmploymentType,
                        industries: jobIndustry,
                    });
                    jobIndex += 1;
                    processed += 1;
                    logger_1.logger.info(tag, `Processed`);
                    if (processed < query.options.limit && jobIndex === jobLinksTot) {
                        logger_1.logger.info(tag, 'Fecthing more jobs');
                        const fetched = yield page.evaluate((linksSelector) => document.querySelectorAll(linksSelector).length, exports.selectors.links);
                        if (fetched === jobLinksTot) {
                            logger_1.logger.info(tag, "No more jobs available in this page");
                        }
                        else {
                            jobLinksTot = fetched;
                        }
                    }
                }
                // Check if we reached the limit of jobs to process
                if (processed === query.options.limit)
                    break;
                // Try pagination to load more jobs
                paginationIndex += 1;
                logger_1.logger.info(tag, `Pagination requested (${paginationIndex})`);
                // const paginationResult = await LoggedInRunStrategy._paginate(page, paginationIndex);
                const paginationResult = yield LoggedInRunStrategy._paginate_new(page, tag);
                // Check if loading jobs has failed
                if (!paginationResult.success) {
                    logger_1.logger.info(tag, paginationResult.error);
                    logger_1.logger.info(tag, "There are no more jobs available for the current query");
                    break;
                }
            }
            return { exit: false };
        });
    }
}
exports.LoggedInRunStrategy = LoggedInRunStrategy;
/**
 * Check if session is authenticated
 * @param {Page} page
 * @returns {Promise<boolean>}
 * @returns {Promise<ILoadResult>}
 * @static
 * @private
 */
LoggedInRunStrategy._isAuthenticatedSession = (page) => __awaiter(void 0, void 0, void 0, function* () {
    const cookies = yield page.cookies();
    return cookies.some(e => e.name === "li_at");
});
/**
 * Try to load job details
 * @param {Page} page
 * @param {string} jobId
 * @param {number} timeout
 * @static
 * @private
 */
LoggedInRunStrategy._loadJobDetails = (page, jobId, timeout = 20000) => __awaiter(void 0, void 0, void 0, function* () {
    const pollingTime = 100;
    let elapsed = 0;
    let loaded = false;
    yield utils_1.sleep(pollingTime); // Baseline to wait
    while (!loaded) {
        loaded = yield page.evaluate((jobId, panelSelector, descriptionSelector) => {
            const detailsPanel = document.querySelector(panelSelector);
            const description = document.querySelector(descriptionSelector);
            return detailsPanel && detailsPanel.innerHTML.includes(jobId) &&
                description && description.innerText.length > 0;
        }, jobId, exports.selectors.detailsPanel, exports.selectors.description);
        if (loaded)
            return { success: true };
        yield utils_1.sleep(pollingTime);
        elapsed += pollingTime;
        if (elapsed >= timeout) {
            return {
                success: false,
                error: `Timeout on loading job details`
            };
        }
    }
    return { success: true };
});
/**
 * Try to paginate
 * @param {Page} page
 * @param {number} paginationIndex
 * @param {number} timeout
 * @returns {Promise<ILoadResult>}
 * @static
 * @private
 */
LoggedInRunStrategy._paginate = (page, paginationIndex, timeout = 20000) => __awaiter(void 0, void 0, void 0, function* () {
    const pollingTime = 100;
    const paginationBtnSelector = exports.selectors.paginationBtn(paginationIndex);
    let elapsed = 0;
    let loaded = false;
    let clicked = false;
    // Wait for pagination html to load
    try {
        yield page.waitForSelector(exports.selectors.pagination, { timeout: timeout });
    }
    catch (err) {
        return {
            success: false,
            error: `Timeout on loading more jobs`
        };
    }
    // Try click next pagination button (if exists)
    clicked = yield page.evaluate((selector) => {
        const button = document.querySelector(selector);
        if (button) {
            button.click();
            return true;
        }
        else {
            return false;
        }
    }, paginationBtnSelector);
    // Failed to click next pagination button (pagination exhausted)
    if (!clicked) {
        return {
            success: false,
            error: `Pagination exhausted`
        };
    }
    // Wait for new jobs to load
    while (!loaded) {
        loaded = yield page.evaluate((selector) => {
            return document.querySelectorAll(selector).length > 0;
        }, exports.selectors.links);
        if (loaded)
            return { success: true };
        yield utils_1.sleep(pollingTime);
        elapsed += pollingTime;
        if (elapsed >= timeout) {
            return {
                success: false,
                error: `Timeout on pagination`
            };
        }
    }
    return { success: true };
});
/**
 * Try to paginate
 * @param {Page} page
 * @param {number} timeout
 * @param {string} tag
 * @returns {Promise<ILoadResult>}
 * @static
 * @private
 */
LoggedInRunStrategy._paginate_new = (page, tag, timeout = 20000) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if there is a new page to load
    try {
        yield page.waitForSelector(exports.selectors.paginationNextBtn, { timeout: timeout });
    }
    catch (err) {
        return {
            success: false,
            error: `There are no more pages to visit`
        };
    }
    const url = new URL(page.url());
    // Extract offset from url
    let offset = parseInt(url.searchParams.get('start') || "0", 10);
    offset += 25;
    // Update offset in url
    url.searchParams.set('start', '' + offset);
    logger_1.logger.debug(tag, "Opening", url.toString());
    // Navigate new url
    yield page.goto(url.toString(), {
        waitUntil: 'load',
    });
    const pollingTime = 100;
    let elapsed = 0;
    let loaded = false;
    // Wait for new jobs to load
    while (!loaded) {
        loaded = yield page.evaluate((selector) => {
            return document.querySelectorAll(selector).length > 0;
        }, exports.selectors.links);
        if (loaded)
            return { success: true };
        yield utils_1.sleep(pollingTime);
        elapsed += pollingTime;
        if (elapsed >= timeout) {
            return {
                success: false,
                error: `Timeout on pagination`
            };
        }
    }
    return { success: true };
});
/**
 * Hide chat panel
 * @param {Page} page
 * @param {string} tag
 */
LoggedInRunStrategy._hideChatPanel = (page, tag) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield page.evaluate((selector) => {
            const div = document.querySelector(selector);
            if (div) {
                div.style.display = "none";
            }
        }, exports.selectors.chatPanel);
    }
    catch (err) {
        logger_1.logger.debug(tag, "Failed to hide chat panel");
    }
});
/**
 * Accept cookies
 * @param {Page} page
 * @param {string} tag
 */
LoggedInRunStrategy._acceptCookies = (page, tag) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const cookieButton = buttons.find(e => e.innerText.includes('Accept cookies'));
            if (cookieButton) {
                cookieButton.click();
            }
        });
    }
    catch (err) {
        logger_1.logger.debug(tag, "Failed to accept cookies");
    }
});
