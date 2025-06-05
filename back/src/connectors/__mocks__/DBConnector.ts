/* eslint-disable @typescript-eslint/no-explicit-any */
const makeGremlinChainMock = (resolvedValue: any = []) => {
    const chain: any = {};
    [
        'V', 'inE', 'outV', 'project', 'by', 'count', 'fold', 'filter', 'is', 'out', 'next', 'has', 'not',
        'id', 'outE', 'addV', 'property', 'hasLabel', 'and', 'or', 'valueMap', 'drop', 'toList', 'mergeV',
        'as', 'option', 'addE', 'from_', 'to', 'where', 'inV', 'hasId', 'emit', 'repeat', 'union', 'identity',
        'local', 'dedup', "select", "both", "bothE", "bothV", "iterate", "group", "in", "in_", "unfold", "values"
    ].forEach(fn => {
        chain[fn] = jest.fn().mockReturnThis();
    });
    chain.toList = jest.fn().mockResolvedValue(resolvedValue);
    chain.next = jest.fn().mockResolvedValue(resolvedValue);
    return chain;
};

const DBConnector = {
    __: jest.fn(() => makeGremlinChainMock()),
    P: jest.fn(() => ({ neq: jest.fn().mockReturnValue('neq') })),
    getGraph: jest.fn(() => Promise.resolve(makeGremlinChainMock())),
    beginTransaction: jest.fn(() => Promise.resolve(undefined)),
    rollbackTransaction: jest.fn(() => Promise.resolve(undefined)),
    commitTransaction: jest.fn(() => Promise.resolve(undefined)),
    T: jest.fn(() => ({ id: 'id' })),
    Merge: jest.fn(() => ({ onCreate: 'onCreate', onMatch: 'onMatch' })),
    unwrapResult: jest.fn(),
    parseGraphResult: jest.fn(),
    Column: jest.fn(() => makeGremlinChainMock())

};

export default DBConnector;
export { makeGremlinChainMock };

export const EDGE_POST_TO_USER: string = "post_to_user";
export const EDGE_USER_TO_POST: string = "user_to_post";
export const EDGE_USER_FOLLOWS: string = "user_follows";
export const EDGE_USER_LIKED_POST: string = "user_liked_post";
export const EDGE_POST_LIKED_BY_USER: string = "post_liked_by_user";
export const EDGE_USER_LIKED_COMMENT: string = "user_liked_comment";
export const EDGE_COMMENT_LIKED_BY_USER: string = "comment_liked_by_user";
export const EDGE_POST_TO_COMMENT: string = "post_to_comment";
export const EDGE_COMMENT_TO_POST: string = "comment_to_post";
export const EDGE_PARENT_TO_CHILD_COMMENT: string = "parent_to_child_comment";
export const EDGE_CHILD_TO_PARENT_COMMENT: string = "child_to_parent_comment";
export const EDGE_COMMENT_TO_USER: string = "comment_to_user";
export const EDGE_USER_TO_COMMENT: string = "user_to_comment";
export const EDGE_USER_TO_TOKEN: string = "user_to_token";
export const EDGE_TOKEN_TO_USER: string = "token_to_user";