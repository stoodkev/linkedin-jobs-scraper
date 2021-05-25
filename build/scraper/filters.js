"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteFilter = exports.experienceLevelFilter = exports.typeFilter = exports.timeFilter = exports.relevanceFilter = void 0;
exports.relevanceFilter = {
    RELEVANT: "R",
    RECENT: "DD",
};
exports.timeFilter = {
    ANY: "",
    DAY: "r86400",
    WEEK: "r604800",
    MONTH: "r2592000",
};
exports.typeFilter = {
    FULL_TIME: "F",
    PART_TIME: "P",
    TEMPORARY: "T",
    CONTRACT: "C",
    INTERNSHIP: "I",
    VOLUNTEER: "V",
    OTHER: "O",
};
exports.experienceLevelFilter = {
    INTERNSHIP: "1",
    ENTRY_LEVEL: "2",
    ASSOCIATE: "3",
    MID_SENIOR: "4",
    DIRECTOR: "5",
    EXECUTIVE: "6",
};
exports.remoteFilter = {
    REMOTE: "true"
};
