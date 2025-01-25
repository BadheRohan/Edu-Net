"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindCursor = exports.FLAGS = void 0;
const responses_1 = require("../cmap/wire_protocol/responses");
const error_1 = require("../error");
const explain_1 = require("../explain");
const count_1 = require("../operations/count");
const execute_operation_1 = require("../operations/execute_operation");
const find_1 = require("../operations/find");
const sort_1 = require("../sort");
const utils_1 = require("../utils");
/** @public Flags allowed for cursor */
exports.FLAGS = [
    'tailable',
    'oplogReplay',
    'noCursorTimeout',
    'awaitData',
    'exhaust',
    'partial'
];
/** @public */
class FindCursor extends explain_1.ExplainableCursor {
    /** @internal */
    constructor(client, namespace, filter = {}, options = {}) {
        super(client, namespace, options);
        /** @internal */
        this.numReturned = 0;
        this.cursorFilter = filter;
        this.findOptions = options;
        if (options.sort != null) {
            this.findOptions.sort = (0, sort_1.formatSort)(options.sort);
        }
    }
    clone() {
        const clonedOptions = (0, utils_1.mergeOptions)({}, this.findOptions);
        delete clonedOptions.session;
        return new FindCursor(this.client, this.namespace, this.cursorFilter, {
            ...clonedOptions
        });
    }
    map(transform) {
        return super.map(transform);
    }
    /** @internal */
    async _initialize(session) {
        const options = {
            ...this.findOptions, // NOTE: order matters here, we may need to refine this
            ...this.cursorOptions,
            session
        };
        if (options.explain) {
            try {
                (0, explain_1.validateExplainTimeoutOptions)(options, explain_1.Explain.fromOptions(options));
            }
            catch {
                throw new error_1.MongoAPIError('timeoutMS cannot be used with explain when explain is specified in findOptions');
            }
        }
        const findOperation = new find_1.FindOperation(this.namespace, this.cursorFilter, options);
        const response = await (0, execute_operation_1.executeOperation)(this.client, findOperation, this.timeoutContext);
        // the response is not a cursor when `explain` is enabled
        this.numReturned = response.batchSize;
        return { server: findOperation.server, session, response };
    }
    /** @internal */
    async getMore(batchSize) {
        const numReturned = this.numReturned;
        if (numReturned) {
            // TODO(DRIVERS-1448): Remove logic to enforce `limit` in the driver
            const limit = this.findOptions.limit;
            batchSize =
                limit && limit > 0 && numReturned + batchSize > limit ? limit - numReturned : batchSize;
            if (batchSize <= 0) {
                try {
                    await this.close();
                }
                catch (error) {
                    (0, utils_1.squashError)(error);
                    // this is an optimization for the special case of a limit for a find command to avoid an
                    // extra getMore when the limit has been reached and the limit is a multiple of the batchSize.
                    // This is a consequence of the new query engine in 5.0 having no knowledge of the limit as it
                    // produces results for the find command.  Once a batch is filled up, it is returned and only
                    // on the subsequent getMore will the query framework consider the limit, determine the cursor
                    // is exhausted and return a cursorId of zero.
                    // instead, if we determine there are no more documents to request from the server, we preemptively
                    // close the cursor
                }
                return responses_1.CursorResponse.emptyGetMore;
            }
        }
        const response = await super.getMore(batchSize);
        // TODO: wrap this in some logic to prevent it from happening if we don't need this support
        this.numReturned = this.numReturned + response.batchSize;
        return response;
    }
    /**
     * Get the count of documents for this cursor
     * @deprecated Use `collection.estimatedDocumentCount` or `collection.countDocuments` instead
     */
    async count(options) {
        (0, utils_1.emitWarningOnce)('cursor.count is deprecated and will be removed in the next major version, please use `collection.estimatedDocumentCount` or `collection.countDocuments` instead ');
        if (typeof options === 'boolean') {
            throw new error_1.MongoInvalidArgumentError('Invalid first parameter to count');
        }
        return await (0, execute_operation_1.executeOperation)(this.client, new count_1.CountOperation(this.namespace, this.cursorFilter, {
            ...this.findOptions, // NOTE: order matters here, we may need to refine this
            ...this.cursorOptions,
            ...options
        }));
    }
    async explain(verbosity, options) {
        const { explain, timeout } = this.resolveExplainTimeoutOptions(verbosity, options);
        return (await (0, execute_operation_1.executeOperation)(this.client, new find_1.FindOperation(this.namespace, this.cursorFilter, {
            ...this.findOptions, // NOTE: order matters here, we may need to refine this
            ...this.cursorOptions,
            ...timeout,
            explain: explain ?? true
        }))).shift(this.deserializationOptions);
    }
    /** Set the cursor query */
    filter(filter) {
        this.throwIfInitialized();
        this.cursorFilter = filter;
        return this;
    }
    /**
     * Set the cursor hint
     *
     * @param hint - If specified, then the query system will only consider plans using the hinted index.
     */
    hint(hint) {
        this.throwIfInitialized();
        this.findOptions.hint = hint;
        return this;
    }
    /**
     * Set the cursor min
     *
     * @param min - Specify a $min value to specify the inclusive lower bound for a specific index in order to constrain the results of find(). The $min specifies the lower bound for all keys of a specific index in order.
     */
    min(min) {
        this.throwIfInitialized();
        this.findOptions.min = min;
        return this;
    }
    /**
     * Set the cursor max
     *
     * @param max - Specify a $max value to specify the exclusive upper bound for a specific index in order to constrain the results of find(). The $max specifies the upper bound for all keys of a specific index in order.
     */
    max(max) {
        this.throwIfInitialized();
        this.findOptions.max = max;
        return this;
    }
    /**
     * Set the cursor returnKey.
     * If set to true, modifies the cursor to only return the index field or fields for the results of the query, rather than documents.
     * If set to true and the query does not use an index to perform the read operation, the returned documents will not contain any fields.
     *
     * @param value - the returnKey value.
     */
    returnKey(value) {
        this.throwIfInitialized();
        this.findOptions.returnKey = value;
        return this;
    }
    /**
     * Modifies the output of a query by adding a field $recordId to matching documents. $recordId is the internal key which uniquely identifies a document in a collection.
     *
     * @param value - The $showDiskLoc option has now been deprecated and replaced with the showRecordId field. $showDiskLoc will still be accepted for OP_QUERY stye find.
     */
    showRecordId(value) {
        this.throwIfInitialized();
        this.findOptions.showRecordId = value;
        return this;
    }
    /**
     * Add a query modifier to the cursor query
     *
     * @param name - The query modifier (must start with $, such as $orderby etc)
     * @param value - The modifier value.
     */
    addQueryModifier(name, value) {
        this.throwIfInitialized();
        if (name[0] !== '$') {
            throw new error_1.MongoInvalidArgumentError(`${name} is not a valid query modifier`);
        }
        // Strip of the $
        const field = name.substr(1);
        // NOTE: consider some TS magic for this
        switch (field) {
            case 'comment':
                this.findOptions.comment = value;
                break;
            case 'explain':
                this.findOptions.explain = value;
                break;
            case 'hint':
                this.findOptions.hint = value;
                break;
            case 'max':
                this.findOptions.max = value;
                break;
            case 'maxTimeMS':
                this.findOptions.maxTimeMS = value;
                break;
            case 'min':
                this.findOptions.min = value;
                break;
            case 'orderby':
                this.findOptions.sort = (0, sort_1.formatSort)(value);
                break;
            case 'query':
                this.cursorFilter = value;
                break;
            case 'returnKey':
                this.findOptions.returnKey = value;
                break;
            case 'showDiskLoc':
                this.findOptions.showRecordId = value;
                break;
            default:
                throw new error_1.MongoInvalidArgumentError(`Invalid query modifier: ${name}`);
        }
        return this;
    }
    /**
     * Add a comment to the cursor query allowing for tracking the comment in the log.
     *
     * @param value - The comment attached to this query.
     */
    comment(value) {
        this.throwIfInitialized();
        this.findOptions.comment = value;
        return this;
    }
    /**
     * Set a maxAwaitTimeMS on a tailing cursor query to allow to customize the timeout value for the option awaitData (Only supported on MongoDB 3.2 or higher, ignored otherwise)
     *
     * @param value - Number of milliseconds to wait before aborting the tailed query.
     */
    maxAwaitTimeMS(value) {
        this.throwIfInitialized();
        if (typeof value !== 'number') {
            throw new error_1.MongoInvalidArgumentError('Argument for maxAwaitTimeMS must be a number');
        }
        this.findOptions.maxAwaitTimeMS = value;
        return this;
    }
    /**
     * Set a maxTimeMS on the cursor query, allowing for hard timeout limits on queries (Only supported on MongoDB 2.6 or higher)
     *
     * @param value - Number of milliseconds to wait before aborting the query.
     */
    maxTimeMS(value) {
        this.throwIfInitialized();
        if (typeof value !== 'number') {
            throw new error_1.MongoInvalidArgumentError('Argument for maxTimeMS must be a number');
        }
        this.findOptions.maxTimeMS = value;
        return this;
    }
    /**
     * Add a project stage to the aggregation pipeline
     *
     * @remarks
     * In order to strictly type this function you must provide an interface
     * that represents the effect of your projection on the result documents.
     *
     * By default chaining a projection to your cursor changes the returned type to the generic
     * {@link Document} type.
     * You should specify a parameterized type to have assertions on your final results.
     *
     * @example
     * ```typescript
     * // Best way
     * const docs: FindCursor<{ a: number }> = cursor.project<{ a: number }>({ _id: 0, a: true });
     * // Flexible way
     * const docs: FindCursor<Document> = cursor.project({ _id: 0, a: true });
     * ```
     *
     * @remarks
     *
     * **Note for Typescript Users:** adding a transform changes the return type of the iteration of this cursor,
     * it **does not** return a new instance of a cursor. This means when calling project,
     * you should always assign the result to a new variable in order to get a correctly typed cursor variable.
     * Take note of the following example:
     *
     * @example
     * ```typescript
     * const cursor: FindCursor<{ a: number; b: string }> = coll.find();
     * const projectCursor = cursor.project<{ a: number }>({ _id: 0, a: true });
     * const aPropOnlyArray: {a: number}[] = await projectCursor.toArray();
     *
     * // or always use chaining and save the final cursor
     *
     * const cursor = coll.find().project<{ a: string }>({
     *   _id: 0,
     *   a: { $convert: { input: '$a', to: 'string' }
     * }});
     * ```
     */
    project(value) {
        this.throwIfInitialized();
        this.findOptions.projection = value;
        return this;
    }
    /**
     * Sets the sort order of the cursor query.
     *
     * @param sort - The key or keys set for the sort.
     * @param direction - The direction of the sorting (1 or -1).
     */
    sort(sort, direction) {
        this.throwIfInitialized();
        if (this.findOptions.tailable) {
            throw new error_1.MongoTailableCursorError('Tailable cursor does not support sorting');
        }
        this.findOptions.sort = (0, sort_1.formatSort)(sort, direction);
        return this;
    }
    /**
     * Allows disk use for blocking sort operations exceeding 100MB memory. (MongoDB 3.2 or higher)
     *
     * @remarks
     * {@link https://www.mongodb.com/docs/manual/reference/command/find/#find-cmd-allowdiskuse | find command allowDiskUse documentation}
     */
    allowDiskUse(allow = true) {
        this.throwIfInitialized();
        if (!this.findOptions.sort) {
            throw new error_1.MongoInvalidArgumentError('Option "allowDiskUse" requires a sort specification');
        }
        // As of 6.0 the default is true. This allows users to get back to the old behavior.
        if (!allow) {
            this.findOptions.allowDiskUse = false;
            return this;
        }
        this.findOptions.allowDiskUse = true;
        return this;
    }
    /**
     * Set the collation options for the cursor.
     *
     * @param value - The cursor collation options (MongoDB 3.4 or higher) settings for update operation (see 3.4 documentation for available fields).
     */
    collation(value) {
        this.throwIfInitialized();
        this.findOptions.collation = value;
        return this;
    }
    /**
     * Set the limit for the cursor.
     *
     * @param value - The limit for the cursor query.
     */
    limit(value) {
        this.throwIfInitialized();
        if (this.findOptions.tailable) {
            throw new error_1.MongoTailableCursorError('Tailable cursor does not support limit');
        }
        if (typeof value !== 'number') {
            throw new error_1.MongoInvalidArgumentError('Operation "limit" requires an integer');
        }
        this.findOptions.limit = value;
        return this;
    }
    /**
     * Set the skip for the cursor.
     *
     * @param value - The skip for the cursor query.
     */
    skip(value) {
        this.throwIfInitialized();
        if (this.findOptions.tailable) {
            throw new error_1.MongoTailableCursorError('Tailable cursor does not support skip');
        }
        if (typeof value !== 'number') {
            throw new error_1.MongoInvalidArgumentError('Operation "skip" requires an integer');
        }
        this.findOptions.skip = value;
        return this;
    }
}
exports.FindCursor = FindCursor;
//# sourceMappingURL=find_cursor.js.map