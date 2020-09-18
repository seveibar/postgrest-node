# postgrest-bin

> PostgREST serves a fully RESTful API from any existing PostgreSQL database. It provides a cleaner, more standards-compliant, faster API than you are likely to write from scratch.

Use [postgrest](http://postgrest.org) ([github](https://github.com/PostgREST/postgrest)) as an npm module for tighter integration with node apps (e.g. test fixtures). Also enables postgrest usage in serverless environments.

## Usage

`npm install postgrest`

```javascript
const postgrest = require("postgrest")

const server = postgrest.startServer({
  dbUri: "postgres://postgrest@localhost:5432/postgres",
  dbSchema: "public",
  serverPort: 3000,
  dbAnonRole: "postgres",
  //...any other postgrest config option, decamilize is run on each key
})

// you can also do this...
// postgrest.startServer("/path/to/postgrest.conf")

// ...let stuff happen

server.stop()
```

## Serverless Usage

[Here's how to run postgrest on a serverless platform like vercel.](https://github.com/seveibar/postgrest-vercel)
