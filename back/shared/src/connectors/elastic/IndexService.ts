import { DeleteResponse, IndexResponse, UpdateResponse } from '@elastic/elasticsearch/lib/api/types';
import ESConnector from './ESConnector';
import { withRetries } from './RetryWrapper';
import config from '../../config';
import { Entry, Global, User } from '../../types';
import { extractFromMultipleTexts } from '../../textUtils';

export class IndexService {
    public static async insertPost(doc: object): Promise<IndexResponse> {
        return withRetries(() =>
            ESConnector.getClient().index({
                index: config.es.mainIndex,
                document: doc,
            })
        );
    }

    public static async insertProfile(doc: any): Promise<IndexResponse> {
        return withRetries(() =>
            ESConnector.getClient().index({
                index: config.es.profileIndex,
                document: doc,
            })
        );
    }

    public static async updatePost(id: string, script?: object, source = false, body?: object): Promise<UpdateResponse> {
        return withRetries(() =>
            ESConnector.getClient().update({
                index: config.es.mainIndex,
                id,
                script,
                body,
                _source: source,
            })
        );
    }

    public static async updateProfile(id: string, script?: object, body?: object): Promise<UpdateResponse> {
        return withRetries(() =>
            ESConnector.getClient().update({
                index: config.es.profileIndex,
                id,
                script,
                body,
            })
        );
    }

    public static async deletePost(id: string): Promise<DeleteResponse> {
        try {
            return await withRetries(() =>
                ESConnector.getClient().delete({
                    index: config.es.mainIndex,
                    id,
                })
            );
        } catch (err: unknown) {
            if ((err as any)?.statusCode === 404) {
                return { result: 'not_found' } as DeleteResponse;
            }
            throw err;
        }
    }

    public static buildDataSetForES = (user: User, global: Global, entries: Entry[]): object => {
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
}
