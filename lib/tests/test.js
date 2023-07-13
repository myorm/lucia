//@ts-check

import { testAdapter } from '@lucia-auth/adapter-test';
import { LuciaError } from "lucia-auth";
import { adapter as myormAdapter } from '../src/index.js';
import { adapter as jsonAdapter } from "@myorm/json-adapter";
import { MyORMContext } from "@myorm/myorm";
import "lucia-auth/polyfill/node";

const connection = jsonAdapter({
    $data: {
        User: [],
        Key: [],
        Session: []
    },
    $schema: {
        User: {
            id: {
                table: 'User',
                field: 'id',
                alias: '',
                isPrimary: true,
                isIdentity: false,
                isVirtual: false,
                isNullable: false,
                isUnique: true,
                datatype: 'string',
                defaultValue: () => undefined
            },
            username: {
                table: 'User',
                field: 'username',
                alias: '',
                isPrimary: false,
                isIdentity: false,
                isVirtual: false,
                isNullable: false,
                isUnique: false,
                datatype: 'string',
                defaultValue: () => undefined
            },
        },
        Key: {
            id: {
                table: 'Key',
                field: 'id',
                alias: '',
                isPrimary: true,
                isIdentity: false,
                isVirtual: false,
                isNullable: false,
                isUnique: true,
                datatype: 'string',
                defaultValue: () => undefined
            },
            user_id: {
                table: 'Key',
                field: 'user_id',
                alias: '',
                isPrimary: false,
                isIdentity: false,
                isVirtual: false,
                isNullable: false,
                isUnique: false,
                datatype: 'string',
                defaultValue: () => undefined
            },
            hashed_password: {
                table: 'Key',
                field: 'hashed_password',
                alias: '',
                isPrimary: false,
                isIdentity: false,
                isVirtual: false,
                isNullable: true,
                isUnique: false,
                datatype: 'string',
                defaultValue: () => undefined
            },
            primary_key: {
                table: 'Key',
                field: 'primary_key',
                alias: '',
                isPrimary: false,
                isIdentity: false,
                isVirtual: false,
                isNullable: false,
                isUnique: false,
                datatype: 'boolean',
                defaultValue: () => undefined
            },
            expires: {
                table: 'Key',
                field: 'expires',
                alias: '',
                isPrimary: false,
                isIdentity: false,
                isVirtual: false,
                isNullable: true,
                isUnique: false,
                datatype: 'int',
                defaultValue: () => undefined
            },
        },
        Session: {
            id: {
                table: 'Session',
                field: 'id',
                alias: '',
                isPrimary: true,
                isIdentity: false,
                isVirtual: false,
                isNullable: false,
                isUnique: false,
                datatype: 'string',
                defaultValue: () => undefined
            },
            user_id: {
                table: 'Session',
                field: 'user_id',
                alias: '',
                isPrimary: false,
                isIdentity: false,
                isVirtual: false,
                isNullable: false,
                isUnique: false,
                datatype: 'string',
                defaultValue: () => undefined
            },
            idle_expires: {
                table: 'Session',
                field: 'idle_expires',
                alias: '',
                isPrimary: false,
                isIdentity: false,
                isVirtual: false,
                isNullable: false,
                isUnique: false,
                datatype: 'int',
                defaultValue: () => undefined
            },
            active_expires: {
                table: 'Session',
                field: 'active_expires',
                alias: '',
                isPrimary: false,
                isIdentity: false,
                isVirtual: false,
                isNullable: false,
                isUnique: false,
                datatype: 'int',
                defaultValue: () => undefined
            }
        }
    }
});

/** @type {MyORMContext<{ id: string, user_id: string, primary_key: boolean, hashed_password: string|null, expires: number|null }>} */
const keys = new MyORMContext(connection, "Key", { allowTruncation: true });
/** @type {MyORMContext<{ id: string, user_id: string, active_expires: number, idle_expires: number }>} */
const sessions = new MyORMContext(connection, "Session", { allowTruncation: true });
/** @type {MyORMContext<{ id: string, username: string }>} */
const users = new MyORMContext(connection, "User", { allowTruncation: true });

const adapter = myormAdapter({
    auth_key: keys,
    auth_session: sessions,
    auth_user: users
})(LuciaError);

/**
 * @template {import('@myorm/myorm').SqlTable} T
 * @param {MyORMContext<T>} ctx 
 * @returns 
 */
function createQueryHandler(ctx) {
    return {
        get: async () => {
            return await ctx.select();
        },
        insert: async (value) => {
            console.log(`inserting `, value);
            await ctx.insert(value);
            console.log(await ctx.select());
        },
        clear: async () => {
            console.log(`Truncating.`);
            await ctx.truncate();
        }
    }
}

const queryHandler = {
    key: createQueryHandler(keys),
    session: createQueryHandler(sessions),
    user: createQueryHandler(users),
}

await testAdapter(adapter, queryHandler, true);