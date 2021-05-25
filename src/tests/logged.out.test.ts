import { IData } from "../scraper/events";
import { IQuery, IQueryOptions } from "../scraper/query";
import { killChromium } from "../utils/browser";
import {
    LinkedinScraper,
    timeFilter,
    relevanceFilter,
    experienceLevelFilter,
    events, typeFilter,
} from "..";

describe('[TEST]', () => {
    jest.setTimeout(240000);

    const onDataFn = (data: IData): void => {
        expect(data.query).toBeDefined();
        expect(data.location).toBeDefined();
        expect(data.jobId).toBeDefined();
        expect(data.title).toBeDefined();
        expect(data.company).toBeDefined();
        expect(data.place).toBeDefined();
        expect(data.date).toBeDefined();
        expect(data.description).toBeDefined();
        expect(data.descriptionHTML).toBeDefined();
        expect(data.link).toBeDefined();
        expect(data.senorityLevel).toBeDefined();
        expect(data.jobFunction).toBeDefined();
        expect(data.employmentType).toBeDefined();
        expect(data.industries).toBeDefined();

        expect(data.location.length).toBeGreaterThan(0);
        expect(data.jobId.length).toBeGreaterThan(0);
        expect(data.title.length).toBeGreaterThan(0);
        expect(data.place.length).toBeGreaterThan(0);
        expect(data.description.length).toBeGreaterThan(0);
        expect(data.descriptionHTML.length).toBeGreaterThan(0);

        expect(() => new URL(data.link)).not.toThrow();

        if (data.applyLink) {
            expect(() => new URL(data.applyLink!)).not.toThrow();
        }

        console.log("[ON_DATA]", "OK", data.jobId);
    };

    const onErrorFn = (err: Error | string) => {
        console.error(err);
    };

    const onEndFn = () => {
        console.log("\nE N D (ツ)_.\\m/");
    }

    const queriesSerial1: IQuery[] = [
        {
            query: "",
            options: {
                limit: 27,
            },
        },
    ];

    const queriesSerial2: IQuery[] = [
        {
            query: 'Engineer',
            options: {
                limit: 10,
                filters: {
                    companyJobsUrl: "https://www.linkedin.com/jobs/search/?f_C=1441%2C10667&geoId=101165590&keywords=engineer&location=United%20Kingdom",
                },
            },
        },
        {
            query: "Designer",
            options: {
                limit: 9,
                optimize: true,
            },
        },
    ];

    const globalOptions: IQueryOptions = {
        optimize: false,
        filters: {
            relevance: relevanceFilter.RECENT,
            time: timeFilter.MONTH,
            type: [typeFilter.FULL_TIME, typeFilter.CONTRACT]
        },
    };

    it('Logged-out strategy', async () => {
        delete process.env.LI_AT_COOKIE;

        const scraper = new LinkedinScraper({
            headless: false,
            args: [
                "--remote-debugging-address=0.0.0.0",
                "--remote-debugging-port=9222",
            ],
            slowMo: 150,
        });

        scraper.on(events.scraper.data, onDataFn);
        scraper.on(events.scraper.error, onErrorFn);
        scraper.on(events.scraper.end, onEndFn);

        try {
            await scraper.run(queriesSerial1, globalOptions);
            await scraper.run(queriesSerial2, globalOptions);
        }
        finally {
            await scraper.close();
            await killChromium();
        }
    });
});
