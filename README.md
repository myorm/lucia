![myorm-logo-text-description-640x283](https://github.com/myorm/myorm/assets/55516053/011d0513-48b5-44bc-aa1b-06860eeb7517)

# `MyORM` Lucia Auth adapter

The `MyORM` Lucia Auth adapter serves as an adapter for [Lucia Auth](https://lucia-auth.com) to provide an easy way to connect authentication schemes to your `MyORM` contexts.

## Getting Started

Run the following commands.

```
npm i @myorm/lucia
npm i @myorm/mysql-adapter # or whichever adapter you prefer to use.
```

Create your database:

```sql
CREATE DATABASE auth;
USE auth;
CREATE TABLE User (
    Id VARCHAR(36) NOT NULL,
    FirstName VARCHAR(40) NOT NULL,
    LastName VARCHAR(40) NOT NULL,
    DateCreated DATETIME DEFAULT NOW(),
    DateModified DATETIME DEFAULT NOW() ON UPDATE NOW(),
    PRIMARY KEY (Id)
);

CREATE TABLE Role (
    Id VARCHAR(36) NOT NULL,
    Title VARCHAR(20) NOT NULL,
    Description VARCHAR(512) NOT NULL,
    DateCreated DATETIME DEFAULT NOW(),
    DateModified DATETIME DEFAULT NOW() ON UPDATE NOW(),
    PRIMARY KEY (Id)
);

CREATE TABLE xUserRole (
    UserId VARCHAR(36) NOT NULL,
    RoleId VARCHAR(36) NOT NULL,
    PRIMARY KEY (UserId, RoleId),
    FOREIGN KEY (UserId) REFERENCES User (Id),
    FOREIGN KEY (RoleId) REFERENCES Role (Id)
);

CREATE TABLE AuthSession (
    Id VARCHAR(256) NOT NULL,
    UserId VARCHAR(36) NOT NULL,
    ActiveExpires LONG NOT NULL,
    IdleExpires LONG NOT NULL,
    DateCreated DATETIME DEFAULT NOW(),
    DateModified DATETIME DEFAULT NOW() ON UPDATE NOW(),
    PRIMARY KEY (Id),
    FOREIGN KEY (UserId) REFERENCES User (Id)
);

CREATE TABLE AuthKey (
    Id VARCHAR(72) NOT NULL,
    UserId VARCHAR(36) NOT NULL,
    PrimaryKey BOOLEAN NOT NULL,
    HashedPassword VARCHAR(256),
    Expires INT,
    DateCreated DATETIME DEFAULT NOW(),
    DateModified DATETIME DEFAULT NOW() ON UPDATE NOW(),
    PRIMARY KEY (Id),
    FOREIGN KEY (UserId) REFERENCES User (Id)
);
```

Construct your TypeScript types:

```ts
export interface Historical {
    DateCreated?: Date;
    DateModified?: Date;
}

export interface User extends Historical {
    Id?: string;
    FirstName: string;
    LastName: string;
    Username: string;
    PassHash: string;

    xUserRoles?: xUserRole[];
    xEnvironmentUsers?: xEnvironmentUser[];
}

export interface Role extends Historical {
    Id?: string;
    Title: string;
    Description: string;

    xUserRoles?: xUserRole[];
}

export interface AuthSession extends Historical {
    Id?: string;
    UserId: string;
    ActiveExpires: number;
    IdleExpires: number;
}

export interface AuthKey extends Historical {
    Id?: string;
    UserId?: string;
    PrimaryKey: boolean;
    HashedPassword?: string;
    Expires?: number;
}

export interface xUserRole {
    UserId?: string;
    RoleId?: string;

    User?: User;
    Role?: Role;
}
```

Import `@myorm/myorm`, `@myorm/mysql-adapter`, and `@myorm/lucia`.

```ts
import { MyORMContext } from '@myorm/myorm';
import { adapter, createMySql2Pool } from '@myorm/mysql-adapter';
import { adapter as luciaAdapter } from '@myorm/lucia';
```

Configure your connection to your database.

```ts
const pool = createMySql2Pool({
    user: 'root',
    password: 'root',
    host: 'localhost',
    port: 3306,
    database:
});

const connection = adapter(pool);

```

Construct your `MyORMContext` objects.

```ts
const users = new MyORMContext<User>(connection, "User");
const userRoles = new MyORMContext<UserRoleXref>(connection, "UserRoleXref");
const roles = new MyORMContext<Role>(connection, "Role");
const keys = new MyORMContext<AuthKey>(connection, "AuthKey");
const sessions = new MyORMContext<AuthSession>(connection, "AuthSession");
```

Configure relationships (if any exist)

```ts
users.hasMany(m => m.UserRoles.fromTable("UserRoleXref").withKeys("Id", "UserId")
    .andThatHasOne(m => m.Role.withKeys("Id", "RoleId")));
```

Initialize `lucia-auth`.

```ts
import lucia from 'lucia-auth';
import { sveltekit } from 'lucia-auth/middleware'; // SvelteKit as an example
export const auth = lucia({
    middleware: sveltekit(),
    adapter: luciaAdapter({
        auth_key: keys,
        auth_session: sessions,
        auth_user: users
    }, {
        // lucia-auth expects the columns to be uniquely.
        auth_key: m => ({
            id: m.Id,
            user_id: m.UserId,
            hashed_password: m.HashedPassword,
            primary_key: m.PrimaryKey,
            expires: m.Expires
        }),
        auth_session: m => ({
            id: m.Id,
            user_id: m.UserId,
            idle_expires: m.IdleExpires,
            active_expires: m.ActiveExpires
        }),
        auth_user: m => ({
            id: m.Id
        })
    })
});
```

And you're done! (with the important part). For more information on what to do next with `lucia-auth`, you can visit their website [here](https://lucia-auth.com).
