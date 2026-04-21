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

