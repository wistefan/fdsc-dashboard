/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { IssuerEntry } from './IssuerEntry';
import type { Links } from './Links';
export type IssuersResponse = {
    /**
     * URI to issuers
     */
    self: string;
    /**
     * list of issuers with their decentralized identifier
     */
    items: Array<IssuerEntry>;
    /**
     * Total number of items in a collection
     */
    total: number;
    /**
     * Number of items to be returned per page
     */
    pageSize: number;
    links: Links;
};

