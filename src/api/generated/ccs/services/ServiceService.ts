/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Scope } from '../models/Scope';
import type { Service } from '../models/Service';
import type { Services } from '../models/Services';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ServiceService {
    /**
     * Create a service with its credentials configuration
     * Create a service with the given configuration. If no id is provided, the service will generate one.
     * @returns string Successfully created the service.
     * @throws ApiError
     */
    public static createService({
        requestBody,
    }: {
        requestBody: Service,
    }): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/service',
            body: requestBody,
            mediaType: 'application/json',
            responseHeader: 'Location',
            errors: {
                400: `Invalid service provided`,
                409: `Service with the given id already exists.`,
            },
        });
    }
    /**
     * Return all services
     * Return all services configured, with pagination.
     * @returns Services The service config.
     * @throws ApiError
     */
    public static getServices({
        pageSize = 100,
        page,
    }: {
        pageSize?: number,
        page?: number,
    }): CancelablePromise<Services> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/service',
            query: {
                'pageSize': pageSize,
                'page': page,
            },
            errors: {
                400: `Invalid query parameters provided`,
            },
        });
    }
    /**
     * Return the full service config by ID
     * The service configuration, including all credentials and their trust anchors will be returned.
     * @returns Service The service config
     * @throws ApiError
     */
    public static getService({
        id,
    }: {
        id: string,
    }): CancelablePromise<Service> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/service/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `No such service exists.`,
            },
        });
    }
    /**
     * Delete the service
     * Delete a single service(and all its configurations) with the given id.
     * @returns void
     * @throws ApiError
     */
    public static deleteServiceById({
        id,
    }: {
        id: string,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/service/{id}',
            path: {
                'id': id,
            },
            errors: {
                404: `No such service exists.`,
            },
        });
    }
    /**
     * Update a single service
     * Updates a single service by fully overriding it.
     * @returns Service Successfully updated the service.
     * @throws ApiError
     */
    public static updateService({
        id,
        requestBody,
    }: {
        id: string,
        requestBody: Service,
    }): CancelablePromise<Service> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/service/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid service provided`,
                404: `No such service exists.`,
            },
        });
    }
    /**
     * Get the scope for the service
     * Returns the scope(e.g. credential types to be requested) for the requested service
     * @returns Scope The scopes to be requested for the service
     * @throws ApiError
     */
    public static getScopeForService({
        id,
        oidcScope,
    }: {
        id: string,
        oidcScope?: string,
    }): CancelablePromise<Scope> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/service/{id}/scope',
            path: {
                'id': id,
            },
            query: {
                'oidcScope': oidcScope,
            },
            errors: {
                404: `No such service exists.`,
            },
        });
    }
}
