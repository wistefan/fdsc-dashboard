/*
 * Copyright 2026 Seamless Middleware Technologies S.L and/or its affiliates
 * and other contributors as indicated by the @author tags.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Issuer } from '../models/Issuer';
import type { IssuersResponse } from '../models/IssuersResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TirService {
    /**
     * Returns a list of trusted issuers.
     * @returns IssuersResponse Successfully returned a list of issuers.
     * @throws ApiError
     */
    public static getIssuersV4({
        pageSize = 10,
        pageAfter,
    }: {
        /**
         * Defines the maximum number of objects that may be returned.
         */
        pageSize?: number,
        /**
         * Cursor that points to the end of the page of data that has been returned.
         */
        pageAfter?: number,
    }): CancelablePromise<IssuersResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v4/issuers/',
            query: {
                'page[size]': pageSize,
                'page[after]': pageAfter,
            },
            errors: {
                400: `Bad Request Error`,
            },
        });
    }
    /**
     * Returns a trusted issuer identified by its decentralised identifier (DID).
     * @returns Issuer Successfully returend the issuer.
     * @throws ApiError
     */
    public static getIssuerV4({
        did,
    }: {
        /**
         * Issuer's DID
         */
        did: string,
    }): CancelablePromise<Issuer> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/v4/issuers/{did}',
            path: {
                'did': did,
            },
            errors: {
                400: `Not found`,
                404: `Bad Request`,
            },
        });
    }
}
