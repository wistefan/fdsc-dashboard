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
import type { Mappings } from '../models/Mappings';
import type { ValidationRequest } from '../models/ValidationRequest';
import type { ValidationResponse } from '../models/ValidationResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UiService {
    /**
     * Validates a policy with a demo request
     * @returns ValidationResponse Validation result
     * @throws ApiError
     */
    public static validatePolicy({
        requestBody,
    }: {
        requestBody: ValidationRequest,
    }): CancelablePromise<ValidationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/validate',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Gets the supported by the PAP.
     * @returns Mappings Successfully retrieved the Mappings.
     * @throws ApiError
     */
    public static getMappings(): CancelablePromise<Mappings> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/mappings',
        });
    }
}
