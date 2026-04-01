/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Service } from './Service';
/**
 * The paginated list of services
 */
export type Services = {
    /**
     * Total number of services available
     */
    total?: number;
    /**
     * Number of the page to be retrieved.
     */
    pageNumber?: number;
    /**
     * Size of the returend page, can be less than the requested depending on the available entries
     */
    pageSize?: number;
    /**
     * The list of services
     */
    services?: Array<Service>;
};

