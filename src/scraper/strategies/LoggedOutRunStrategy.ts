import { RunStrategy, IRunStrategyResult, ILoadResult } from "./RunStrategy";
import { Page } from "puppeteer";
import { events } from "../events";
import { sleep } from "../../utils/utils";
import { IQuery } from "../query";
import { logger } from "../../logger/logger";

export class Selectors {
    static switchSelectors = false;

    static get container() {
        return !this.switchSelectors ? '.results__container.results__container--two-pane' :
            '.two-pane-serp-page__results-list';
    }

    static get jobs() {
        return !this.switchSelectors ? '.jobs-search__results-list li' :
            '.jobs-search__results-list li';
    }

    static get links() {
        return !this.switchSelectors ? '.jobs-search__results-list li a.result-card__full-card-link' :
            'a.base-card__full-link';
    }

    static get applyLink() {
        return 'a[data-is-offsite-apply=true]';
    }

    static get dates() {
        return 'time';
    }

    static get companies() {
        return !this.switchSelectors ? '.result-card__subtitle.job-result-card__subtitle' :
            '.base-search-card__subtitle';
    }

    static get places() {
        return !this.switchSelectors ? '.job-result-card__location' :
            '.job-search-card__location';
    }

    static get detailsPanel() {
        return '.details-pane__content';
    }

    static get description() {
        return '.description__text';
    }

    static get criteria() {
        return !this.switchSelectors ? 'li.job-criteria__item' :
            '.description__job-criteria-item';
    }

    static get seeMoreJobs() {
        return 'button.infinite-scroller__show-more-button';
    }
}

/**
 * @class LoggedOutRunStrategy
 * @extends RunStrategy
 */
export class LoggedOutRunStrategy extends RunStrategy {

    /**
     * Verify if authentication is required
     * @param {Page} page
     * @returns {Promise<boolean>}
     * @static
     * @private
     */
    private static _needsAuthentication = async (
        page: Page
    ): Promise<boolean> => {
        const parsed = new URL(await page.url());
        return parsed.pathname.toLowerCase().includes("authwall");
    };

    /**
     * Wait for job details to load
     * @param page {Page}
     * @param jobId {string}
     * @param timeout {number}
     * @returns {Promise<ILoadResult>}
     * @static
     * @private
     */
    private static _loadJobDetails = async (
        page: Page,
        jobId: string,
        timeout: number = 2000
    ): Promise<ILoadResult> => {
        const waitTime = 50;
        let elapsed = 0;
        let loaded = false;

        while(!loaded) {
            loaded = await page.evaluate(
                (
                    jobId: string,
                    panelSelector: string,
                    descriptionSelector: string
                ) => {
                    const detailsPanel = document.querySelector(panelSelector) as HTMLElement;
                    const description = document.querySelector(descriptionSelector) as HTMLElement;
                    return detailsPanel && detailsPanel.innerHTML.includes(jobId) &&
                        description && description.innerText.length > 0;
                },
                jobId,
                Selectors.detailsPanel,
                Selectors.description
            );

            if (loaded) return { success: true };

            await sleep(waitTime);
            elapsed += waitTime;

            if (elapsed >= timeout) {
                return {
                    success: false,
                    error: `Timeout on loading job details`
                };
            }
        }

        return { success: true };
    };

    /**
     * Try to load more jobs
     * @param page {Page}
     * @param jobLinksTot {number}
     * @param timeout {number}
     * @returns {Promise<ILoadResult>}
     * @private
     */
    private static _loadMoreJobs = async (
        page: Page,
        jobLinksTot: number,
        timeout: number = 2000
    ): Promise<ILoadResult> => {
        const pollingTime = 100;
        let elapsed = 0;
        let loaded = false;
        let clicked = false;

        while(!loaded) {
            if (!clicked) {
                clicked = await page.evaluate(
                    (selector: string) => {
                        const button = <HTMLElement>document.querySelector(selector);

                        if (button) {
                            button.click();
                            return true;
                        }
                        else {
                            return false;
                        }
                    },
                    Selectors.seeMoreJobs
                );
            }

            loaded = await page.evaluate(
                (selector: string, jobLinksTot: number) => {
                    window.scrollTo(0, document.body.scrollHeight);
                    return document.querySelectorAll(selector).length > jobLinksTot;
                },
                Selectors.links,
                jobLinksTot
            );

            if (loaded) return { success: true };

            await sleep(pollingTime);
            elapsed += pollingTime;

            if (elapsed >= timeout) {
                return {
                    success: false,
                    error: `Timeout on loading more jobs`
                };
            }
        }

        return { success: true };
    };

    /**
     * Accept cookies
     * @param {Page} page
     * @param {string} tag
     */
    private static _acceptCookies = async (
        page: Page,
        tag: string,
    ): Promise<void> => {
        try {
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const cookieButton = buttons.find(e => e.innerText.includes('Accept cookies'));

                if (cookieButton) {
                    cookieButton.click();
                }
            });
        }
        catch (err) {
            logger.debug(tag, "Failed to accept cookies");
        }
    };

    /**
     * Run strategy
     * @param page
     * @param url
     * @param query
     * @param location
     */
    public run = async (
        page: Page,
        url: string,
        query: IQuery,
        location: string,
    ): Promise<IRunStrategyResult> => {
        let tag = `[${query.query}][${location}]`;
        let processed = 0;

        logger.info(tag, "Opening", url);

        await page.goto(url, {
            waitUntil: 'load',
        });

        // Verify if authentication is required
        if ((await LoggedOutRunStrategy._needsAuthentication(page))) {
            logger.error(tag, "Scraper failed to run in anonymous mode, authentication may be necessary for this environment. Please check the documentation on how to use an authenticated session.")
            return { exit: true };
        }

        // Linkedin seems to randomly load two different set of selectors:
        // the following hack tries to switch between the two sets

        // Try to load first set of selectors
        try {
            Selectors.switchSelectors = false;
            logger.info(tag, 'Trying to load first selectors set');
            logger.debug(tag, `Evaluating selectors`, [Selectors.container]);
            await page.waitForSelector(Selectors.container, { timeout: 3000 });
        }
        catch(err) {
            // Try to load second set of selectors
            try {
                Selectors.switchSelectors = true;
                logger.info(tag, 'Trying to load second selectors set');
                logger.debug(tag, `Evaluating selectors`, [Selectors.container]);
                await page.waitForSelector(Selectors.container, { timeout: 3000 });
            }
            catch(err) {
                logger.info(tag, 'Failed to load container selector, skip');
                return { exit: false };
            }
        }

        logger.info(tag, 'OK');

        let jobIndex = 0;

        // Pagination loop
        while (processed < query.options!.limit!) {
            await LoggedOutRunStrategy._acceptCookies(page, tag);

            // Get number of all job links in the page
            let jobLinksTot = await page.evaluate(
                (linksSelector: string) => document.querySelectorAll(linksSelector).length,
                Selectors.links
            );

            if (jobLinksTot === 0) {
                logger.info(tag, `No jobs found, skip`);
                break;
            }

            logger.info(tag, "Jobs fetched: " + jobLinksTot);

            // Jobs loop
            while (jobIndex < jobLinksTot && processed < query.options!.limit!) {
                tag = `[${query.query}][${location}][${processed + 1}]`;

                let jobId;
                let jobLink;
                let jobApplyLink;
                let jobTitle;
                let jobCompany;
                let jobPlace;
                let jobDescription;
                let jobDescriptionHTML;
                let jobDate;
                let jobSenorityLevel;
                let jobFunction;
                let jobEmploymentType;
                let jobIndustries;
                let loadJobDetailsResult;

                try {
                    // Extract job main fields
                    logger.debug(tag, `Evaluating selectors`, [
                        Selectors.links,
                        Selectors.companies,
                        Selectors.places,
                        Selectors.dates,
                    ]);

                    [jobId, jobTitle, jobCompany, jobPlace, jobDate] = await page.evaluate(
                        (
                            jobsSelector: string,
                            linksSelector: string,
                            companiesSelector: string,
                            placesSelector: string,
                            datesSelector: string,
                            jobIndex: number
                        ) => {
                            let jobId: string | null = '';

                            // Try first set of selectors
                            jobId = document.querySelectorAll(jobsSelector)[jobIndex].getAttribute('data-id');

                            // If failed, try second set of selectors
                            if (!jobId) {
                                jobId = (<HTMLElement>document.querySelectorAll(linksSelector)[jobIndex])
                                    .parentElement!.getAttribute('data-entity-urn')!
                                    .split(':').splice(-1)[0];
                            }

                            return [
                                jobId,
                                (<HTMLElement>document.querySelectorAll(linksSelector)[jobIndex]).innerText,
                                (<HTMLElement>document.querySelectorAll(companiesSelector)[jobIndex]).innerText,
                                (<HTMLElement>document.querySelectorAll(placesSelector)[jobIndex]).innerText,
                                (<HTMLElement>document.querySelectorAll(datesSelector)[jobIndex])
                                    .getAttribute('datetime')
                            ];
                        },
                        Selectors.jobs,
                        Selectors.links,
                        Selectors.companies,
                        Selectors.places,
                        Selectors.dates,
                        jobIndex
                    );

                    // Load job details and extract job link
                    logger.debug(tag, `Evaluating selectors`, [
                        Selectors.links,
                    ]);

                    [jobLink, loadJobDetailsResult] = await Promise.all([
                        page.evaluate((linksSelector: string, jobIndex: number) => {
                                const linkElem = <HTMLElement>document.querySelectorAll(linksSelector)[jobIndex];
                                linkElem.scrollIntoView();
                                linkElem.click();
                                return linkElem.getAttribute("href");
                            },
                            Selectors.links,
                            jobIndex
                        ),

                        LoggedOutRunStrategy._loadJobDetails(page, jobId!),
                    ]);

                    // Check if loading job details has failed
                    if (!loadJobDetailsResult.success) {
                        logger.error(tag, loadJobDetailsResult.error);
                        this.scraper.emit(events.scraper.error, `${tag}\t${loadJobDetailsResult.error}`);
                        jobIndex += 1;
                        continue;
                    }

                    // Use custom description function if available
                    logger.debug(tag, `Evaluating selectors`, [
                        Selectors.description
                    ]);

                    if (query.options?.descriptionFn) {
                        [jobDescription, jobDescriptionHTML] = await Promise.all([
                            page.evaluate(`(${query.options.descriptionFn.toString()})();`),
                            page.evaluate((selector) => {
                                return (<HTMLElement>document.querySelector(selector)).outerHTML;
                            }, Selectors.description)
                        ]);
                    }
                    else {
                        [jobDescription, jobDescriptionHTML] = await page.evaluate((selector) => {
                                const el = (<HTMLElement>document.querySelector(selector));
                                return [el.innerText, el.outerHTML];
                            },
                            Selectors.description
                        );
                    }

                    // Extract apply link
                    logger.debug(tag, `Evaluating selectors`, [
                        Selectors.applyLink
                    ]);

                    jobApplyLink = await page.evaluate((selector) => {
                        const applyBtn = document.querySelector<HTMLElement>(selector);
                        return applyBtn ? applyBtn.getAttribute("href") : null;
                    }, Selectors.applyLink);

                    // Extract other job fields
                    logger.debug(tag, `Evaluating selectors`, [
                        Selectors.criteria
                    ]);

                    [
                        jobSenorityLevel,
                        jobFunction,
                        jobEmploymentType,
                        jobIndustries,
                    ] = await page.evaluate(
                        (
                            jobCriteriaSelector: string
                        ) => {
                            const items = document.querySelectorAll(jobCriteriaSelector);

                            const criteria = [
                                'Seniority level',
                                'Job function',
                                'Employment type',
                                'Industries'
                            ];

                            const nodeList = criteria.map(criteria => {
                                const el = Array.from(items)
                                    .find(li =>
                                        (<HTMLElement>li.querySelector('h3')).innerText === criteria);

                                return el ? el.querySelectorAll('span') : [];
                            });

                            return Array.from(nodeList)
                                .map(spanList => Array.from(spanList as Array<HTMLElement>)
                                    .map(e => e.innerText).join(', '));
                        },
                        Selectors.criteria
                    );
                }
                catch(err) {
                    const errorMessage = `${tag}\t${err.message}`;
                    this.scraper.emit(events.scraper.error, errorMessage);
                    jobIndex += 1;
                    continue;
                }

                // Emit data
                this.scraper.emit(events.scraper.data, {
                    query: query,
                    location: location,
                    jobId: jobId!,
                    jobIndex: jobIndex,
                    link: jobLink!,
                    ...jobApplyLink && { applyLink: jobApplyLink },
                    title: jobTitle!,
                    company: jobCompany!,
                    place: jobPlace!,
                    description: jobDescription! as string,
                    descriptionHTML: jobDescriptionHTML! as string,
                    date: jobDate!,
                    senorityLevel: jobSenorityLevel,
                    jobFunction: jobFunction,
                    employmentType: jobEmploymentType,
                    industries: jobIndustries,
                });

                jobIndex += 1;
                processed += 1;
                logger.info(tag, `Processed`);

                if (processed < query.options!.limit! && jobIndex === jobLinksTot) {
                    logger.info(tag, 'Fecthing new jobs');
                    jobLinksTot = await page.evaluate(
                        (linksSelector) => document.querySelectorAll(linksSelector).length,
                        Selectors.links
                    );
                }
            }

            // Check if we reached the limit of jobs to process
            if (processed === query.options!.limit!) break;

            // Check if there are more jobs to load
            logger.info(tag, "Checking for new jobs to load...");

            const loadMoreJobsResult = await LoggedOutRunStrategy._loadMoreJobs(
                page,
                jobLinksTot
            );

            // Check if loading jobs has failed
            if (!loadMoreJobsResult.success) {
                logger.info(tag, "There are no more jobs available for the current query");
                break;
            }
        }

        return { exit: false };
    }
}
