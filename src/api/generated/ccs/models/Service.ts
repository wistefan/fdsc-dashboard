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
import type { ServiceScopesEntry } from './ServiceScopesEntry';
/**
 * Configuration of a service and its credentials
 */
export type Service = {
    /**
     * Id of the service to be configured. If no id is provided, the service will generate one.
     */
    id?: string;
    /**
     * Default OIDC scope to be used if none is specified
     */
    defaultOidcScope: string;
    /**
     * A specific OIDC scope for that service, specifying the necessary VC types (credentials)
     */
    oidcScopes: Record<string, ServiceScopesEntry>;
    /**
     * The authorization redirect to be created.
     */
    authorizationType?: 'FRONTEND_V2' | 'DEEPLINK';
};

