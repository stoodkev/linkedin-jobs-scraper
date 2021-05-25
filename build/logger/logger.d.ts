declare const logger: {
    debug: any;
    info: any;
    warn: any;
    error: any;
    enable: () => void;
    disable: () => void;
    enableDebug: () => void;
    enableInfo: () => void;
    enableWarn: () => void;
    enableError: () => void;
};
export { logger };
