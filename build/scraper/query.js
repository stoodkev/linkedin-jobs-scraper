"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = void 0;
const url_1 = require("../utils/url");
const filters_1 = require("./filters");
/**
 * Validate query
 * @param {IQuery} query
 * @returns {IQueryValidationError[]}
 */
const validateQuery = (query) => {
    const errors = [];
    if (query.query && typeof (query.query) !== "string") {
        errors.push({
            param: "query",
            reason: `Must be a string`
        });
    }
    if (query.options) {
        const { locations, filters, descriptionFn, limit, } = query.options;
        if (locations && (!Array.isArray(locations) || !locations.every(e => typeof (e) === "string"))) {
            errors.push({
                param: "options.locations",
                reason: `Must be an array of strings`
            });
        }
        if (descriptionFn && typeof (descriptionFn) !== "function") {
            errors.push({
                param: "options.descriptionFn",
                reason: `Must be a function`
            });
        }
        if (query.options.hasOwnProperty("optimize") && typeof (query.options.optimize) !== "boolean") {
            errors.push({
                param: "options.optimize",
                reason: `Must be a boolean`
            });
        }
        if (limit && (!Number.isInteger(limit) || limit <= 0)) {
            errors.push({
                param: "options.limit",
                reason: `Must be a positive integer`
            });
        }
        if (filters) {
            if (filters.companyJobsUrl) {
                if (typeof (filters.companyJobsUrl) !== "string") {
                    errors.push({
                        param: "options.filters.companyUrl",
                        reason: `Must be a string`
                    });
                }
                try {
                    const baseUrl = "https://www.linkedin.com/jobs/search/?";
                    new URL(filters.companyJobsUrl); // Check url validity
                    const queryParams = url_1.getQueryParams(filters.companyJobsUrl);
                    if (!filters.companyJobsUrl.toLowerCase().startsWith(baseUrl)
                        || !queryParams.hasOwnProperty("f_C") || !queryParams["f_C"]) {
                        errors.push({
                            param: "options.filters.companyJobsUrl",
                            reason: `Url is invalid. Please check the documentation on how find a company jobs link from LinkedIn`
                        });
                    }
                }
                catch (err) {
                    errors.push({
                        param: "options.filters.companyJobsUrl",
                        reason: `Must be a valid url`
                    });
                }
            }
            if (filters.relevance) {
                const allowed = Object.values(filters_1.relevanceFilter);
                if (!allowed.includes(filters.relevance)) {
                    errors.push({
                        param: "options.filters.relevance",
                        reason: `Must be one of ${allowed.join(", ")}`
                    });
                }
            }
            if (filters.time) {
                const allowed = Object.values(filters_1.timeFilter);
                if (!allowed.includes(filters.time)) {
                    errors.push({
                        param: "options.filters.time",
                        reason: `Must be one of ${allowed.join(", ")}`
                    });
                }
            }
            if (filters.type) {
                const allowed = Object.values(filters_1.typeFilter);
                if (!Array.isArray(filters.type)) {
                    filters.type = [filters.type];
                }
                for (const t of filters.type) {
                    if (!allowed.includes(t)) {
                        errors.push({
                            param: "options.filters.type",
                            reason: `Must be one of ${allowed.join(", ")}`
                        });
                    }
                }
            }
            if (filters.experience) {
                const allowed = Object.values(filters_1.experienceLevelFilter);
                if (!Array.isArray(filters.experience)) {
                    filters.experience = [filters.experience];
                }
                for (const t of filters.experience) {
                    if (!allowed.includes(t)) {
                        errors.push({
                            param: "options.filters.experience",
                            reason: `Must be one of ${allowed.join(", ")}`
                        });
                    }
                }
            }
            if (filters.remote) {
                const allowed = Object.values(filters_1.remoteFilter);
                if (!allowed.includes(filters.remote)) {
                    errors.push({
                        param: "options.filters.remote",
                        reason: `Must be one of ${allowed.join(", ")}`
                    });
                }
            }
        }
    }
    return errors;
};
exports.validateQuery = validateQuery;
