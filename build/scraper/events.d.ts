declare type BrowserEvent = "disconnected" | "targetchanged" | "targetcreated" | "targetdestroyed";
export interface IData {
    query: string;
    location: string;
    jobId: string;
    jobIndex: number;
    link: string;
    applyLink?: string;
    title: string;
    company: string;
    place: string;
    date: string;
    description: string;
    descriptionHTML: string;
    senorityLevel: string;
    jobFunction: string;
    employmentType: string;
    industries: string;
}
interface IEvents {
    scraper: {
        data: "scraper:data";
        error: "scraper:error";
        invalidSession: "scraper:invalid-session";
        end: "scraper:end";
    };
    puppeteer: {
        browser: {
            disconnected: BrowserEvent;
            targetchanged: BrowserEvent;
            targetcreated: BrowserEvent;
            targetdestroyed: BrowserEvent;
        };
    };
}
declare const events: IEvents;
export interface IEventListeners {
    ["scraper:data"]: (data: IData) => void;
    ["scraper:error"]: (error: Error | string) => void;
    ["scraper:invalid-session"]: () => void;
    ["scraper:end"]: () => void;
    ["disconnected"]: (...args: any[]) => void;
    ["targetchanged"]: (...args: any[]) => void;
    ["targetcreated"]: (...args: any[]) => void;
    ["targetdestroyed"]: (...args: any[]) => void;
}
export { events };
