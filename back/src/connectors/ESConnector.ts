import { Client } from '@elastic/elasticsearch';
import logger from "../logger/logger";
import config from '../config';
import { Entry, User, Global, Post, Profile } from '../utils/types';
import fs from 'fs';
import { DeleteResponse, IndexResponse, SearchResponse, UpdateResponse } from '@elastic/elasticsearch/lib/api/types';
import { extractFromMultipleTexts, extractTextSuggestionsFlat } from '../utils/textUtils';
import RedisConnector from './RedisConnector';
import path from 'path';
import pRetry, { FailedAttemptError } from 'p-retry';

type SuggestionResponse = {
    postSuggestions: string[];
    profileSuggestions: string[];
    uniqueProfiles: Profile[];
};

type AsyncFunction<T> = () => Promise<T>;

export default class ESConnector {
    private client: Client;

    constructor() {
        logger.info("Connecting to ElasticSearch...");
        this.client = new Client({
            node: config.es.node,
            auth: {                
                apiKey: config.es.apiKey                
            },
            tls: {
                //rejectUnauthorized: false,
                ca: fs.readFileSync(path.resolve(__dirname, '../../certs/ca.crt')),
            }
        });
    }

    public getClient = (): Client => {
        return this.client;
    }

    private async withRetries<T>(fn: AsyncFunction<T>): Promise<T> {
        return await pRetry(fn, {
            retries: config.database.maxRetries,                  // number of retry attempts
            minTimeout: config.database.minTimeout,              // initial wait time (ms)
            maxTimeout: config.database.maxTimeout,             // max wait time (ms)
            factor: config.database.backoffFactor,             // exponential backoff factor
            onFailedAttempt: (error: FailedAttemptError) => {
                logger.warn(
                    `Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left. Error:`,
                    error
                );
            }
        }) as Promise<T>;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public buildHashtagQuery = (term: string, searchAfter?: any[]) => {
        const index: string = config.es.mainIndex;
        const size: number = config.es.defaultPaginationSize;

        return {
            index,
            size,
            search_after: searchAfter,
            sort: [
                {
                    "global.dateTime": {
                        order: "desc",
                        nested: { path: "global" }
                    }
                },
                { postId: "asc" }
            ],
            query: {
                term: {
                    "hashtags.raw": term
                }
            }
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public buildSearchQuery = (isPost: boolean, isAuto: boolean, query: string, searchAfter?: any[]) => {
        const index: string = isPost ? config.es.mainIndex : config.es.profileIndex;
        const size: number = config.es.defaultPaginationSize;

        // Define post-related should queries (nested fields, etc.)
        const postShouldQueries = [
            {
                nested: {
                    path: "global",
                    query: {
                        multi_match: {
                            query,
                            fields: [
                                "global.captionText^2",
                                "global.captionText.fuzzy",
                                "global.locationText^2",
                                "global.locationText.fuzzy"
                            ],
                            type: "best_fields",
                            fuzziness: isAuto ? "0" : "AUTO"
                        }
                    }
                }
            },
            {
                nested: {
                    path: "media",
                    query: {
                        multi_match: {
                            query,
                            fields: [
                                "media.altText^2",
                                "media.altText.fuzzy"
                            ],
                            type: "best_fields",
                            fuzziness: isAuto ? "0" : "AUTO"
                        }
                    }
                }
            },
            {
                match: {
                    hashtags: {
                        query,
                        boost: 3
                    }
                }
            },
            {
                match: {
                    mentions: {
                        query
                    }
                }
            },
            {
                nested: {
                    path: "user",
                    query: {
                        match: {
                            "user.userName": {
                                query,
                                fuzziness: isAuto ? "0" : "AUTO",
                                boost: 2
                            }
                        }
                    }
                }
            }
        ];

        // Define profile-related should queries (simpler, non-nested fields)
        const profileShouldQueries = [
            {
                match: {
                    userName: {
                        query,
                        operator: "and",
                        analyzer: "hashtag_autocomplete",
                        boost: 3
                    }
                }
            },
            {
                match: {
                    bio: {
                        query,
                        operator: "and",
                        analyzer: "hashtag_autocomplete",
                        boost: 2
                    }
                }
            },
            {
                match: {
                    firstName: {
                        query,
                        boost: 1
                    }
                }
            },
            {
                match: {
                    lastName: {
                        query,
                        boost: 1
                    }
                }
            },
            {
                match: {
                    hashtags: {
                        query,
                        boost: 3
                    }
                }
            },
            {
                match: {
                    mentions: {
                        query
                    }
                }
            }
        ];

        return {
            index,
            size,
            search_after: searchAfter,
            sort: isPost
                ? [
                    {
                        "global.dateTime": {
                            order: "desc",
                            nested: {
                                path: "global", filter: {
                                    exists: {
                                        field: "global.dateTime"
                                    }
                                }
                            }
                        }
                    },
                    { postId: "asc" }
                ]
                : [{ userId: "asc" }],
            query: {
                bool: {
                    should: isPost ? postShouldQueries : profileShouldQueries
                }
            }
        };
    }

    public buildSuggestQuery = (input: string, size: number, isHashtag: boolean)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : { mainSuggestBody: any; profileSuggestBody: any } => {

        const normalizedInput = input.trim().toLowerCase();

        if (isHashtag) {
            // Return suggest queries targeting hashtag fields only
            return {
                mainSuggestBody: {
                    suggest: {
                        hashtags: {
                            prefix: normalizedInput,
                            completion: {
                                size,
                                field: 'hashtags.suggest',
                                skip_duplicates: true
                            }
                        }
                    }
                },
                profileSuggestBody: {
                    suggest: {
                        hashtags: {
                            prefix: normalizedInput,
                            completion: {
                                size,
                                field: 'hashtags.suggest',
                                skip_duplicates: true
                            }
                        }
                    }
                }
            };
        }

        // Return suggest queries for the non-hashtag fields we care about
        return {
            mainSuggestBody: {
                suggest: {
                    userName: {
                        prefix: normalizedInput,
                        completion: {
                            size,
                            field: 'user.userName.suggest'
                        }
                    },
                    locationText: {
                        prefix: normalizedInput,
                        completion: {
                            size,
                            field: 'global.locationText.suggest'
                        }
                    }
                }
            },
            profileSuggestBody: {
                suggest: {
                    userName: {
                        prefix: normalizedInput,
                        completion: {
                            size,
                            field: 'userName.suggest'
                        }
                    },
                    firstName: {
                        prefix: normalizedInput,
                        completion: {
                            size,
                            field: 'firstName.suggest'
                        }
                    },
                    lastName: {
                        prefix: normalizedInput,
                        completion: {
                            size,
                            field: 'lastName.suggest'
                        }
                    }
                }
            }
        };
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public buildProfileSearchQuery = (names: string[], isHashtag: boolean, size: number): any => {
        const fields = isHashtag
            ? ['hashtags^3']
            : ['userName^3', 'lastName^2', 'firstName', 'bio'];

        return {
            size,
            query: {
                bool: {
                    should: names.map(name => ({
                        multi_match: {
                            query: name,
                            type: 'phrase_prefix',
                            fields
                        }
                    })),
                    minimum_should_match: 1
                }
            }
        };
    };

    public getAllSuggestions = async (input: string, type: string = "both", resultSize?: string): Promise<SuggestionResponse> => {
        if (!input.trim()) {
            return {
                postSuggestions: [],
                profileSuggestions: [],
                uniqueProfiles: []
            };
        }

        const resultSizeAsNum = Number(resultSize);
        const size: number = isNaN(resultSizeAsNum) ? config.es.defaultSuggestionResultSize : Math.min(resultSizeAsNum, config.es.defaultResultSize);
        const isProfileOnly: boolean = type === "profiles";
        const normalizedInput = input.trim().toLowerCase();
        const isHashtag: boolean = normalizedInput.startsWith('#');
        const cacheKey = `suggestions:${normalizedInput}:${size}`;

        // Check if results are in redis cache first
        const cachedResult = await RedisConnector.get(cacheKey);
        if (cachedResult) {
            return JSON.parse(cachedResult);
        }

        // Build query bodies for suggesters
        const { mainSuggestBody, profileSuggestBody } = this.buildSuggestQuery(normalizedInput, size, isHashtag);
        let mainSuggest = null;
        let profilesSuggest = null;

        // Execute suggest queries in parallel
        if (isProfileOnly) {
            profilesSuggest = await this.withRetries<SearchResponse<Profile>>(() =>
                this.client?.search<Profile>({
                    index: config.es.profileIndex,
                    body: profileSuggestBody,
                })
            );
        } else {
            [mainSuggest, profilesSuggest] = await Promise.all([
                this.withRetries<SearchResponse<Post>>(() =>
                    this.client?.search<Post>({
                        index: config.es.mainIndex,
                        _source: false,
                        body: mainSuggestBody,
                    })
                ),
                this.withRetries<SearchResponse<Profile>>(() =>
                    this.client?.search<Profile>({
                        index: config.es.profileIndex,
                        body: profileSuggestBody,
                    })
                )
            ]);
        }

        // Flatten and limit suggestions to global size
        let postSuggestions: string[] = [];
        if (!isProfileOnly && mainSuggest) {
            postSuggestions = extractTextSuggestionsFlat(mainSuggest.suggest, size);
        }

        const profileSuggestions = extractTextSuggestionsFlat(profilesSuggest.suggest, size);
        // Remove duplicates and limit to size
        const uniqueNames = [...new Set(profileSuggestions)].slice(0, size);
        let uniqueProfiles: Profile[] = [];

        // Fetch full profile docs if we have name suggestions
        if (uniqueNames.length > 0) {
            // Query profiles index to fetch full Profile docs
            const profileQueryBody = this.buildProfileSearchQuery(uniqueNames, isHashtag, size);
            const profilesQuery: SearchResponse<Profile> = await this.withRetries(() =>
                this.client?.search<Profile>({
                    index: config.es.profileIndex,
                    body: profileQueryBody
                })
            );

            uniqueProfiles = (profilesQuery?.hits.hits || [])
                .filter(hit => !!hit._id && !!hit._source?.userName)
                .map(hit => ({
                    userId: hit._source?.userId || "",
                    profileId: hit._id as string,
                    userName: hit._source!.userName,
                    bio: hit._source!.bio,
                    pfp: hit._source!.pfp,
                    firstName: hit._source!.firstName,
                    lastName: hit._source!.lastName,
                    gender: hit._source!.gender,
                    pronouns: hit._source!.pronouns,
                    link: hit._source!.link,
                }));
        }

        // Create the result to store in cache
        const result = {
            postSuggestions,
            profileSuggestions,
            uniqueProfiles
        };

        // Cache the result for future use
        try {
            await RedisConnector.set(cacheKey, JSON.stringify(result));
        } catch (err) {
            return result;
        }

        return result;
    }

    public search = async (query: object, resultSize: number | null) => {
        const size: number = resultSize ? resultSize : config.es.defaultResultSize;

        const result = await this.withRetries(() =>
            this.client?.search({
                index: config.es.mainIndex,
                query,
                size,
                sort: [
                    {
                        "global.dateTime": {
                            "order": "asc",
                            "nested": {
                                "path": "global"
                            },
                            "mode": "min"
                        }
                    },
                ]
            }, { meta: true }));

        return result;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public searchWithPagination = async (query: any, dateTime: string | undefined, postId: string | undefined, resultSize?: number | null)
        : Promise<SearchResponse> => {

        const size: number = resultSize ? resultSize : config.es.defaultPaginationSize;

        // Data needed for pagination in ES
        if (dateTime != null && postId != null) {
            query.search_after = [dateTime, postId];
        }

       return await this.withRetries(() => 
            this.client?.search({
                index: config.es.mainIndex,
                body: query,
                size,
            })
        );
    }

    public searchProfile = async (query: object, resultSize: number | null): Promise<SearchResponse> => {
        const size: number = resultSize ? resultSize : config.es.defaultResultSize;

        return await this.withRetries(() =>
            this.client?.search({
                index: config.es.profileIndex,
                query,
                size,
            })
        );
    }

    public delete = async (id: string): Promise<DeleteResponse> => {
        if (!this.client) {
            throw new Error("ES client not initialized");
        }

        try {
            return await this.withRetries(() =>
                this.client?.delete({
                    index: config.es.mainIndex,
                    id
                })
            );

        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((err as any).statusCode === 404) {
                logger.warn(`ES document with id ${id} not found`);
                return { result: "not_found" } as DeleteResponse;
            }
            throw err;
        }
    }

    public count = async (query: object) => {
        return this.withRetries(() =>
            this.client.count({
                index: config.es.mainIndex,
                query,
            }, { meta: true })
        );
    }

    public countProfile = async (query: object) => {
        return this.withRetries(() =>
            this.client.count({
                index: config.es.profileIndex,
                query,
            }, { meta: true })
        );
    }

    public insert = async (dataSet: object): Promise<IndexResponse> => {
        return this.withRetries(() =>
            this.client.index({
                index: config.es.mainIndex,
                document: dataSet
            })
        );
    }

    public insertProfile = async (dataSet: object): Promise<IndexResponse> => {
        return this.withRetries(() =>
            this.client.index({
                index: config.es.profileIndex,
                document: dataSet
            })
        );
    }

    public update = async (id: string, script?: object, source?: boolean, body?: object): Promise<UpdateResponse> => {
        return this.withRetries(() =>
            this.client.update({
                index: config.es.mainIndex,
                id,
                script,
                body,
                _source: source || false
            })
        );
    }

    public updateProfile = async (id: string, script?: object, body?: object): Promise<UpdateResponse> => {
        return this.withRetries(() =>
            this.client.update({
                index: config.es.profileIndex,
                id,
                script,
                body
            })
        );
    }

    public close = async () => {
        await this.client?.close();
    }
}

export const buildDataSetForES = (user: User, global: Global, entries: Entry[]): object => {
    const { hashtags, mentions } = extractFromMultipleTexts([
        global.captionText,
        global.locationText,
        ...entries.map((entry) => entry.alt)
    ])

    const dataSet = {
        hashtags,
        mentions,
        user: {
            userId: user.userId,
            userName: user.userName,
            pfp: user.pfp
        },
        global: {
            dateTime: new Date(),
            captionText: global.captionText,
            commentsDisabled: global.commentsDisabled,
            likesDisabled: global.likesDisabled,
            locationText: global.locationText,
            likes: global.likes || [],
            collaborators: global.collaborators || []
        },
        media: entries.map((entry) => {
            return {
                altText: entry.alt,
                entityTag: entry.entityTag,
                id: entry.id,
                mimeType: entry.mimeType,
                path: entry.url,
                postId: entry.postId,
                userId: entry.userId
            }
        })
    };

    return dataSet;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildSearchResultSet = (hits: any[]): Post[] => {
    const results: Post[] = hits.map((entry): Post => {
        const source = entry._source;
        return {
            postId: "",
            user: {
                userId: source.user.userId,
                userName: source.user.userName,
                pfp: ""
            },
            global: {
                id: entry._id,
                dateTime: source.global.dateTime,
                captionText: source.global.captionText,
                commentsDisabled: source.global.commentsDisabled,
                likesDisabled: source.global.likesDisabled,
                locationText: source.global.locationText,
                commentCount: 0,
                likes: [],
                collaborators: source.global.collaborators || []
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            media: source.media.map((media: any) => {
                return {
                    altText: media.altText,
                    id: media.id,
                    mimeType: media.mimeType,
                    path: media.path,
                    postId: media.postId,
                    userId: media.userId
                }
            })
        }
    });

    return results;
}

// Memoized factory for ESConnector instance
let esConnectorInstance: ESConnector | null = null;

export const getESConnector = (): ESConnector => {
    if (!esConnectorInstance) {
        esConnectorInstance = new ESConnector();
    }
    return esConnectorInstance;
}

// Optional reset function for cleanup or testing
export async function resetESConnector(): Promise<void> {
    if (esConnectorInstance) {
        await esConnectorInstance.close();
        esConnectorInstance = null;
    }
}