# Meteor APM Server (ex. Kadira)

This project reduces the original Kadira APM to a single Meteor project.
Most of the original features are working (like Slack alerts), but there is still a lot of work.
Feel free to contribute!

## Running it

A mongo replica set is required!
Check 'docker/meteor-apm-server/deploy-to-host-example.sh' for settings consumed by node.js, meteor and deployment options.

This uses the following ports:

* UI: 3000
* RMA: 11011
* API: 7007

You can use the steps below to build your own APM image.
```
cd docker/meteor-apm-server
./build.sh
./push-to-registry.sh
```
The build script uses our meteor-base images for building and running meteor application bundles. See `docker/meteor-base/` for details.

## Login

If running on new Replica Set, the app creates 'admin' user:
email: admin@admin.com
password: admin
Default admin password can be overrided with ADMIN_PASSWORD environment variable.

When inviting new users to collaborate or own the app, new entries are added to the collection 'users' with their emails as logins. Passwords are rendomly generated and can be found in logs (useful when there is no email provider credentials). Then ivitation link is sended using settings from 'MAIL_URL' & 'MAIL_DOMAIN' environment variables. Users can change their passwords after first logon.

If you don't have any mail server settings, you can manually create users in 'users' collection. The following example creates new user with 'changeAfterLogon' password:
```
db.users.insert({
    "_id" : "ZTx86k4b5vpqMzr98",
    "createdAt" : ISODate("2018-01-08T12:34:51.172Z"),
    "services" : {
        "password" : {
            "bcrypt" : "$2a$10$UHAbwU4DznmhNZbO..Ub9.51bL1gOUbfNT4lNGYbPEoFBaNqRCXd6"
        },
        "resume" : {
            "loginTokens" : []
        }
    },
    "username" : "exampleUser",
    "emails" : [ 
        {
            "address" : "email@example.com",
            "verified" : true
        }
    ],
    "states" : {
        "__inited" : 1515415494812.0,
        "activated" : 1515415674900.0
    }
})
```

Adding user as a collaborator to the app in 'apps' collection:
```
    "perAppTeam" : [ 
        {
            "role" : "collaborator",
            "userId" : "XXXXXXXXXXXXX" <--- document ID of user entry in 'users' collection.
        }
    ]
```


## Meteor apm settings
Environment variable `METRICS_LIFETIME` sets the maximum lifetime of the metrics. Old metrics are removed after each aggregation.
The default value is 604800000 (1000 * 60 * 60 * 24 * 7 ^= 7 days). You can set any custom value (for ex. 259200000 = 3 days) with:
```
-e METRICS_LIFETIME=259200000
```

Another important thing is about rate limits for all requests. Defaults are set in `server/engine/lib/middlewares/ratelimit.js`:
```
limit = 10
resetTimeout = 1000
limitTotalTraces = 100
```
If multiple servers use the same appId or there is a heavy webapp activity, there are possible errors like `Kadira Error: Agent Error: 429` (too many requests) in your Meteor app logs or tons of `blocked due to high throughput - appId: <your appId>` in APM server logs. 
So rate limit defaults can be overrided by defining environment variables `RATE_LIMIT`, `RESET_TIMEOUT` and `TOTAL_TRACES`.
```
-e RATE_LIMIT=100
-e RESET_TIMEOUT=1000
-e TOTAL_TRACES=1000
```

## Connect your app to Meteor APM server via Meteor Settings:
1) . Add following into your `settings.json` file:
```
"kadira": { 
    "appId": "<appId>",
    "appSecret": "<appSecret>",
    "options": {
        "endpoint": "http://apm.mydomain.com:11011",
        "sourceMap": "true" <<-- OPTIONAL
    }
},
```
Check https://github.com/knotel/meteor-apm-client to know more about "sourceMap" option & adding source-maps support to your apps.

If your APM instance is running the same private subnet as your application server, you can set separate endpoints for webapp servers (private network) and for client browsers (public network):
```
"kadira": { 
    "appId": "<appId>",
    "appSecret": "<appSecret>",
    "options": {
        "endpoint": "http://apm.mydomain.internal:11011",
        "webClientEndpoint": "http://apm.mydomain.com:11011"
    }
},
```


### ATTENTION! As most webapps work using HTTPS, metrics and errors should be collected using HTTPS connection to APM, too. You can build NGINX image for it, using example settings provided in ./docker/nginx folder of this repo.

## Changes to original project:

* Reduce to one project
* Added MongoDB indexes
* Removed MongoDB shards
* Remove raw data after processed
* Use Meteor 1.6 (Node v8)
* Removed premium packages
* Replace invalid links to old kadira docs
* Dockerized bundle
* Source-maps support (with knotel:meteor-apm-client package)
* Create users using email address for sending collaboration or ownership invitations
