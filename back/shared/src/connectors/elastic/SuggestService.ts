import { SearchResponse } from "@elastic/elasticsearch/lib/api/types";
import config from "../../config";
import { Post, Profile } from "../../types";
import RedisConnector from "../RedisConnector";
import { withRetries } from "./RetryWrapper";
import { extractTextSuggestionsFlat } from "../../textUtils";
import { SearchService } from "./SearchService";

type SuggestionResponse = {
    postSuggestions: string[];
    profileSuggestions: string[];
    uniqueProfiles: Profile[];
};

export class SuggestService {
    public static buildSuggestQuery = (input: string, size: number, isHashtag: boolean)
        : { mainSuggestBody: object; profileSuggestBody: object } => {

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

    public static buildProfileSearchQuery = (names: string[], isHashtag: boolean, size: number): object => {
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

    public static getSuggestions = async (input: string, type: string = "both", resultSize?: string)
        : Promise<SuggestionResponse> => {

        const results:SuggestionResponse = {
            postSuggestions: [],
            profileSuggestions: [],
            uniqueProfiles: []            
        }

        if (!input.trim()) {
            return results;
        }

        const size = Math.min(Number(resultSize) || config.es.defaultSuggestionResultSize, config.es.defaultResultSize);
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
        let postSuggestions: string[] = [];
        let profileSuggestions: string[] = [];
        let postSuggestResponse: SearchResponse<Post> | null = null;
        let profileSuggestResponse: SearchResponse<Profile>;        

        if (isProfileOnly) {            
            profileSuggestResponse = await withRetries<SearchResponse<Profile>>(
                () => SearchService.searchProfiles(profileSuggestBody) as any
            );
            results.profileSuggestions = extractTextSuggestionsFlat(profileSuggestResponse.suggest, size);
        } else {
            // Execute suggest queries in parallel
            [postSuggestResponse, profileSuggestResponse] = await Promise.all([
                SearchService.searchPosts(mainSuggestBody) as any,
                SearchService.searchProfiles(profileSuggestBody) as any
            ]);     
        }

        // Flatten and limit suggestions to global size
        if (!isProfileOnly && postSuggestResponse) {
            postSuggestions = extractTextSuggestionsFlat(postSuggestResponse.suggest, size);
        }

        profileSuggestions = extractTextSuggestionsFlat(profileSuggestResponse.suggest, size);
        // Remove duplicates and limit to size
        const uniqueNames = [...new Set(profileSuggestions)].slice(0, size);
        let uniqueProfiles: Profile[] = [];

        // Fetch full profile docs if we have name suggestions
        if (uniqueNames.length > 0) {
            // Query profiles index to fetch full Profile docs
            const profileQueryBody = this.buildProfileSearchQuery(uniqueNames, isHashtag, size);
            const profilesQuery: SearchResponse<Profile> = await withRetries(() =>
                SearchService.searchProfiles(profileQueryBody) as any
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
        const result:SuggestionResponse = {
            postSuggestions,
            profileSuggestions,
            uniqueProfiles
        };

        // Cache the result for future use
        await RedisConnector.set(cacheKey, JSON.stringify(result));

        return result;
    }
}