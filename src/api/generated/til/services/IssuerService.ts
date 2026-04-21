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
import type { TrustedIssuer } from '../models/TrustedIssuer';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class IssuerService {
    /**
     * Create a trusted issuer and its credentials
     * create trusted issuer
     * @returns any Successfully created the issuer.
     * @throws ApiError
     */
    public static createTrustedIssuer({
        requestBody,
    }: {
        requestBody: TrustedIssuer,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/issuer',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid issuer provided`,
                409: `Issuer with the given did already exists.`,
            },
        });
    }
    /**
     * Get a single issuer
     * @returns TrustedIssuer Successfully retrieved the issuer.
     * @throws ApiError
     */
    public static getIssuer({
        did,
    }: {
        did: string,
    }): CancelablePromise<TrustedIssuer> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/issuer/{did}',
            path: {
                'did': did,
            },
            errors: {
                404: `No such issuer exists.`,
            },
        });
    }
    /**
     * Delete a single issuer
     * @returns void
     * @throws ApiError
     */
    public static deleteIssuerById({
        did,
    }: {
        did: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/issuer/{did}',
            path: {
                'did': did,
            },
            errors: {
                404: `No such issuer exists.`,
            },
        });
    }
    /**
     * Update a single issuer
     * @returns TrustedIssuer Successfully updated the issuer.
     * @throws ApiError
     */
    public static updateIssuer({
        did,
        requestBody,
    }: {
        did: string,
        requestBody: TrustedIssuer,
    }): CancelablePromise<TrustedIssuer> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/issuer/{did}',
            path: {
                'did': did,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid issuer provided`,
                404: `No such issuer exists.`,
            },
        });
    }
}
