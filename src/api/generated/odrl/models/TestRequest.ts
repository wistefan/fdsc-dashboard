/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Headers } from './Headers';
export type TestRequest = {
    method?: 'POST' | 'PATCH' | 'PUT' | 'GET' | 'DELETE';
    host?: string;
    path?: string;
    protocol?: 'https';
    body?: Record<string, any>;
    headers?: Headers;
};

