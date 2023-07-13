//@ts-check

import { LuciaError } from 'lucia-auth';

/**
 * Object model that contains a reference to each context that must be used with the `lucia-auth` library.
 * @template {import('@myorm/myorm').SqlTable} TUser
 * Model represented by the `auth_user` context.
 * @template {import('@myorm/myorm').SqlTable} TSession
 * Model represented by the `auth_session` context.
 * @template {import('@myorm/myorm').SqlTable} TKey
 * Model represented by the `auth_key` context.
 * @typedef {object} AuthTables
 * @prop {import('@myorm/myorm').MyORMContext<TUser>} auth_user
 * Context connected to a table for User objects.
 * @prop {import('@myorm/myorm').MyORMContext<TSession>} auth_session
 * Context connected to a table for Session objects.
 * @prop {import('@myorm/myorm').MyORMContext<TKey>} auth_key 
 * Context connected to a table for Provider Key objects.
 */

/**
 * Object model that contains a map from the expected columns for a User object in `lucia-auth` to the actual column name represented in your table.
 * @template {import('@myorm/myorm').SqlTable} TUser
 * Model represented by the `auth_user` context.
 * @typedef {object} AuthUserColumnNames
 * @prop {(keyof TUser)=} id
 * Column name that represents the id of the User object.
 */

/**
 * Object model that contains a map from the expected columns for a Session object in `lucia-auth` to the actual column name represented in your table.
 * @template {import('@myorm/myorm').SqlTable} TSession
 * Model represented by the `auth_session` context.
 * @typedef {object} AuthSessionColumnNames
 * @prop {(keyof TSession)=} id
 * Column name that represents the id of the Session object.
 * @prop {(keyof TSession)=} user_id
 * Column name that represents the id of the User object.
 * @prop {(keyof TSession)=} active_expires
 * Column name that represents the milliseconds since 01/01/1970 00:00:00 for when the active session should expire.
 * @prop {(keyof TSession)=} idle_expires
 * Column name that represents the milliseconds since 01/01/1970 00:00:00 for when the idle session should expire.
 */

/**
 * Object model that contains a map from the expected columns for a Provider Key object in `lucia-auth` to the actual column name represented in your table.
 * @template {import('@myorm/myorm').SqlTable} TKey
 * Model represented by the `auth_key` context.
 * @typedef {object} AuthKeyColumnNames
 * @prop {(keyof TKey)=} id
 * Column name that represents the id of the Provider Key object.
 * @prop {(keyof TKey)=} user_id
 * Column name that represents the id of the User object.
 * @prop {(keyof TKey)=} primary_key
 * Column name that represents if the row is the primary key representing the User.
 * @prop {(keyof TKey)=} hashed_password
 * Column name that represents the hash of the password.
 * @prop {(keyof TKey)=} expires
 * Column name that represents the milliseconds since 01/01/1970 00:00:00 for when the key should expire.
 */

const proxy = new Proxy(/** @type {any} */ ({}), {
    get: (t,p) => {
        if(typeof p !== "string") throw new Error(`Property reference must be of type string. (Property: ${String(p)})`);
        return p;
    }
});

/**
 * Adapter for the [lucia-auth](https://lucia-auth.com/) library for [MyORM](https://myorm.dev) contexts.
 * @template {import('@myorm/myorm').SqlTable} TUser
 * Model represented by the `auth_user` context.
 * @template {import('@myorm/myorm').SqlTable} TSession
 * Model represented by the `auth_session` context.
 * @template {import('@myorm/myorm').SqlTable} TKey
 * Model represented by the `auth_key` context.
 * @param {AuthTables<TUser, TSession, TKey>} contexts
 * Object containing properties for the expected tables in `lucia-auth` (auth_user, auth_session, auth_key) 
 * in which the value expects to be the respective `MyORMContext` object that connects to the appropriate and respective tables.
 * @param {{ 
 *   auth_user: (model: {[K in keyof TUser]-?: TUser[K] extends import('@myorm/myorm').SqlTable|undefined 
 *     ? TUser[K] 
 *     : TUser[K] extends import('@myorm/myorm').SqlTable[]|undefined 
 *       ? TUser[K]
 *       : K}) => AuthUserColumnNames<TUser>, 
 *   auth_session: (model: {[K in keyof TSession]-?: K}) => AuthSessionColumnNames<TSession>, 
 *   auth_key: (model: {[K in keyof TKey]-?: K}) => AuthKeyColumnNames<TKey>,
 * }} keys
 * Object containing properties for the expected tables in `lucia-auth` (auth_user, auth_session, auth_key) 
 * in which the value expects a callback for mapping the table columns from your contexts to what `lucia-auth` expects them to be.  
 * You can choose to omit columns that may already have the naming scheme, or omit this parameter all together if the table exactly replicates `lucia-auth`'s expected database model.
 * @returns {(E: import('lucia-auth').LuciaErrorConstructor) => import('lucia-auth').Adapter}
 * `lucia-auth` adapter for usage within `lucia`.
 */
export const adapter = ({ 
    auth_user, 
    auth_session, 
    auth_key 
}, { 
    auth_user: $auth_user, 
    auth_session: $auth_session, 
    auth_key: $auth_key 
} = { 
    auth_user: m => m, 
    auth_session: m => m, 
    auth_key: m => m 
}) => {
    const $$auth_user = {
        id: "id",
        ...$auth_user(proxy) 
    };
    const $$auth_session = {
        id: "id",
        user_id: "user_id",
        active_expires: "active_expires",
        idle_expires: "idle_expires",
        ...$auth_session(proxy)
    };
    const $$auth_key = {
        id: "id",
        user_id: "user_id",
        primary_key: "primary_key",
        hashed_password: "hashed_password",
        expires: "expires",
        ...$auth_key(proxy)
    };

    return () => ({
        getSessionAndUserBySessionId: async (sessionId) => {
            const [session] = (await auth_session
                .where(m => (/** @type {any} */(m))[$$auth_session.id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(sessionId))
                .select()).map(/** @type {any} */ ($auth_session));
            
            if(!session) return null;
            
            const [user] = (await auth_user
                .where(m => (/** @type {any} */(m))[$$auth_user.id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(session[$$auth_session.user_id]))
                .select()).map(/** @type {any} */ ($auth_user));
            
            if(!user) return null;

            return { 
                user, 
                session 
            };
        },
        // Session adapter
        deleteSession: async (...sessionIds) => {
            await auth_session
                .where(m => (/** @type {any} */(m))[$$auth_session.id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .in(sessionIds))
                .delete();
        },
        deleteSessionsByUserId: async (userId) => {
            await auth_session
                .where(m => (/** @type {any} */(m))[$$auth_session.user_id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(userId))
                .delete();
        },
        getSession: async (sessionId) => {
            const [session] = (await auth_session
                .where(m => (/** @type {any} */(m))[$$auth_session.id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(sessionId))
                .select()).map(/** @type {any} */ ($auth_session));
            return session ?? null;
        },
        getSessionsByUserId: async (userId) => {
            const sessions = (await auth_session
                .where(m => (/** @type {any} */(m))[$$auth_session.user_id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(userId))
                .select()).map(/** @type {any} */ ($auth_session));
            return sessions;
        },
        setSession: async (session) => {
            await userIdCheck(auth_user, $$auth_user.id, session.user_id);
            /** @type {any} */
            const newSession = {};
            for(const key in $$auth_session) {
                const realColumnName = $$auth_session[/** @type {keyof typeof $$auth_session} */(key)];
                if(key in session) {
                    newSession[realColumnName] = /** @type {any} */ (session)[key];
                }
            }
            try {
                await auth_session.insert(newSession);
            } catch(err) {
                throw new LuciaError('AUTH_DUPLICATE_SESSION_ID');
            }
        },
        // User adapter
        deleteKeysByUserId: async (userId) => {
            await auth_key
                .where(m => (/** @type {any} */(m))[$$auth_key.user_id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(userId))
                .delete();
        },
        deleteNonPrimaryKey: async (keyId) => {
            await auth_key
                .where(m => (/** @type {any} */(m))[$$auth_key.primary_key]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(false))
                .where(m => (/** @type {any} */(m))[$$auth_key.id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(keyId))
                .delete();
        },
        deleteUser: async (userId) => {
            await auth_user
                .where(m => (/** @type {any} */(m))[$$auth_user.id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(userId))
                .delete();
        },
        getKey: async (keyId) => {
            const [key] = (await auth_key
                .where(m => (/** @type {any} */(m))[$$auth_key.id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(keyId))
                .select()).map(/** @type {any} */ ($auth_key));
            return key ?? null;
        },
        getKeysByUserId: async (userId) => {
            const keys = (await auth_key
                .where(m => (/** @type {any} */(m))[$$auth_key.user_id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(userId))
                .select()).map(/** @type {any} */ ($auth_key));
            return keys ?? null;
        },
        getUser: async (userId) => {
            const [user] = (await auth_user
                .where(m => (/** @type {any} */(m))[$$auth_user.id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(userId))
                .select()).map(/** @type {any} */ ($auth_user));
            return user ?? null;
        },
        setKey: async (key) => {
            await userIdCheck(auth_user, $$auth_user.id, key.user_id);
            /** @type {any} */
            const newKey = {};
            for(const k in $$auth_key) {
                const realColumnName = $$auth_key[/** @type {keyof typeof $$auth_key} */(k)];
                if(k in key) {
                    newKey[realColumnName] = /** @type {any} */ (key)[k];
                }
            }
            try {
                await auth_key.insert(newKey);
            } catch(err) {
                throw new LuciaError('AUTH_DUPLICATE_KEY_ID');
            }
        },
        setUser: async (userId, attributes, key) => {
            let user = /** @type {TUser} */ ({ [$$auth_user.id]: userId, ...attributes });
            [user] = (await auth_user.insert(user)).map(/** @type {any} */ ($auth_user));
            if(key) {
                /** @type {any} */
                const newKey = {};
                for(const k in $$auth_key) {
                    const realColumnName = $$auth_key[/** @type {keyof typeof $$auth_key} */(k)];
                    if(k in key) {
                        newKey[realColumnName] = /** @type {any} */ (key)[k];
                    }
                }
                try {
                    await auth_key.insert(newKey);
                } catch(err) {
                    throw new LuciaError('AUTH_DUPLICATE_KEY_ID');
                }
                console.log(await auth_key.select());
            }

            return user;
        },
        updateKeyPassword: async (keyId, hashedPassword) => {
            await auth_key
                .where(m => (/** @type {any} */(m))[$$auth_key.id]
                    // @ts-ignore .where behaves strangely on untyped contexts.
                    .equals(keyId))
                .update(m => {
                    (/** @type {any} */(m))[$$auth_key.hashed_password] = hashedPassword;
                });
        },
        updateUserAttributes: async (userId, attributes) => {
            const user = /** @type {TUser} */ ({ [$$auth_user.id]: userId, ...attributes });
            await auth_user.update(user);
        }  
    });
}

/**
 * Checks if the given `user_id_val` exists within the context. If not, a LuciaError for AUTH_INVALID_USER_ID is thrown.
 * @template {import('@myorm/myorm').SqlTable} TUser
 * @param {import('@myorm/myorm').MyORMContext<TUser>} auth_user
 * @param {keyof TUser} user_id_key
 * @param {string} user_id_val
 */
async function userIdCheck(auth_user, user_id_key, user_id_val) {
    const n = await auth_user
        // @ts-ignore .where behaves strangely on untyped contexts.
        .where(m => m[user_id_key]
            .equals(user_id_val))
        .count();
    if(n <= 0) {
        throw new LuciaError('AUTH_INVALID_USER_ID');
    }
}