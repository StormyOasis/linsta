import { Client } from '@elastic/elasticsearch';
import logger from "../logger/logger";
import Metrics from "../metrics/Metrics";
import config from 'config';
import { Entry, User, Global, Post, Profile } from '../utils/types';
import fs from 'fs';
import { ClusterHealthResponse, DeleteResponse, IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import { extractFromMultipleTexts, extractTextSuggestionsFlat } from '../utils/textUtils';
import RedisConnector from './RedisConnector';

type SuggestionResponse = {
    postSuggestions: string[];
    profileSuggestions: string[];
    uniqueProfiles: Profile[];
};

export default class ESConnector {
    private static instance: ESConnector | null = null;

    private client: Client | null = null;
    private metricsInterval: NodeJS.Timeout | null;

    private constructor() {
        this.client = new Client({
            node: config.get("es.node"),
            auth: {
                apiKey: config.get("es.apiKey")
            },
            tls: {
                ca: fs.readFileSync("/usr/share/es/certs/ca.crt"),
            }
        });

        const timeout: number = config.get("es.metricsIntervalMs") as number;

        this.metricsInterval = setInterval(async (connector: ESConnector) => {
            if (connector === null || connector.getClient() === null) {
                return;
            }

            try {
                const health: ClusterHealthResponse | undefined = await connector.client?.cluster.health();
                const stats: IndicesStatsResponse | undefined = await connector.client?.indices.stats();
                if (health && stats) {
                    Metrics.gauge('es.cluster_status', Metrics.mapEsStatus(health.status));
                    Metrics.gauge('es.number_of_nodes', health.number_of_nodes);
                    Metrics.gauge('es.active_primary_shards', health.active_primary_shards);
                    Metrics.gauge('es.active_shards', health.active_shards);
                    Metrics.gauge('es.task_max_waiting_in_queue_millis', health.task_max_waiting_in_queue_millis);
                    Metrics.gauge('es.number_of_pending_tasks', health.number_of_pending_tasks);
                    Metrics.gauge('es.total_docs_count', stats._all.total?.docs?.count || -1);
                    Metrics.gauge('es.unassigned_shards', health?.unassigned_shards || 0);
                }
            } catch (err) {
                logger.error("Error getting ES Metrics", err);
                Metrics.gauge('es.cluster_status', Metrics.mapEsStatus("red"));
                Metrics.gauge('es.number_of_nodes', 0);
            }

        }, timeout, this);
    }

    public static getInstance(): ESConnector {
        if (!ESConnector.instance) {
            ESConnector.instance = new ESConnector();
        }

        return ESConnector.instance;
    }

    public getClient = (): (Client | null) => {
        return this.client;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public buildHashtagQuery = (term: string, searchAfter?: any[]) => {
        const index: string = config.get("es.mainIndex");
        const size: number = config.get("es.defaultPaginationSize");

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
        const index: string = isPost ? config.get("es.mainIndex") : config.get("es.profileIndex");
        const size: number = config.get("es.defaultPaginationSize");

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
                            nested: { path: "global" }
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

    public getAllSuggestions = async (input: string): Promise<SuggestionResponse> => {
        if (!input.trim()) {
            return {
                postSuggestions: [],
                profileSuggestions: [],
                uniqueProfiles: []
            };
        }

        const size: number = config.get("es.defaultSuggestionResultSize");
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

        // Execute suggest queries in parallel
        const [mainSuggest, profilesSuggest] = await Promise.all([
            this.client?.search({ index: config.get("es.mainIndex"), _source: false, body: mainSuggestBody }),
            this.client?.search({ index: config.get("es.profileIndex"), body: profileSuggestBody })
        ]);

        // Flatten and limit suggestions to global size
        const postSuggestions = extractTextSuggestionsFlat(mainSuggest?.suggest, size);
        const profileSuggestions = extractTextSuggestionsFlat(profilesSuggest?.suggest, size);
        // Remove duplicates and limit to size
        const uniqueNames = [...new Set(profileSuggestions)].slice(0, size);
        let uniqueProfiles: Profile[] = [];

        // Fetch full profile docs if we have name suggestions
        if (uniqueNames.length > 0) {
            // Query profiles index to fetch full Profile docs
            const profileQueryBody = this.buildProfileSearchQuery(uniqueNames, isHashtag, size);
            const profilesQuery = await this.client?.search({
                index: config.get("es.profileIndex"),
                body: profileQueryBody
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            uniqueProfiles = (profilesQuery?.hits.hits || []).map((hit: any) => ({ profileId: hit._id, ...hit._source }));
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
        const size: number = resultSize ? resultSize : config.get("es.defaultResultSize");

        const result = await this.client?.search({
            index: config.get("es.mainIndex"),
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
        }, { meta: true });

        return result;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public searchWithPagination = async (query: any, dateTime:string|undefined, postId:string|undefined, resultSize?: number | null) => {
        const size: number = resultSize ? resultSize : config.get("es.defaultPaginationSize");

        // Data needed for pagination in ES
        if (dateTime != null && postId != null) {
            query.search_after = [dateTime, postId];
        }

        const result = await this.client?.search({
            index: config.get("es.mainIndex"),
            body: query,
            size,
        }, { meta: true });

        return result;
    }

    public delete = async (id: string): Promise<DeleteResponse> => {
        if (!this.client) {
            throw new Error("ES client not initialized");
        }

        try {
            const result = await this.client?.delete({
                index: config.get("es.mainIndex"),
                id
            });

            return result;
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
        const result = await this.client?.count({
            index: config.get("es.mainIndex"),
            query,
        }, { meta: true });

        return result;
    }

    public searchProfile = async (query: object, resultSize: number | null) => {
        const size: number = resultSize ? resultSize : config.get("es.defaultResultSize");

        const result = await this.client?.search({
            index: config.get("es.profileIndex"),
            query,
            size,
        }, { meta: true });

        return result;
    }

    public countProfile = async (query: object) => {
        const result = await this.client?.count({
            index: config.get("es.profileIndex"),
            query,
        }, { meta: true });

        return result;
    }

    public insert = async (dataSet: object) => {
        const result = await this.client?.index({
            index: config.get("es.mainIndex"),
            document: dataSet
        });

        return result;
    }

    public insertProfile = async (dataSet: object) => {
        const result = await this.client?.index({
            index: config.get("es.profileIndex"),
            document: dataSet
        });

        return result;
    }

    public update = async (id: string, script?: object, source?: boolean, body?: object) => {
        const result = await this.client?.update({
            index: config.get("es.mainIndex"),
            id,
            script,
            body,
            _source: source || false
        });
        return result;
    }

    public updateProfile = async (id: string, script?: object, body?: object) => {
        const result = await this.client?.update({
            index: config.get("es.profileIndex"),
            id,
            script,
            body
        });
        return result;
    }

    public close = async () => {
        this.metricsInterval && clearInterval(this.metricsInterval);
        await this.client?.close();
        ESConnector.instance = null;
        this.client = null;
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
            likes: global.likes || []
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
                likes: []
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