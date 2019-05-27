# Quick start

1. `cp .env.example .env && cp client/deploy/.env.dist client/deploy/.env && cp server/deploy/.env.dist server/deploy/.env`
2. `cd client && npm i`
3. `cd ../server && npm i`
4. In the root directory run: `docker-compose up`

- Grab a coffee -

5. Make sure everything is running: `docker ps -a`

### Using the mongodb admin

1. Go to http://localhost:1234
2. Input the following string into the "Connection string" input:
   `mongodb://admin:password@database:27017/database?authMechanism=SCRAM-SHA-1&authSource=admin`

### Tests

The backend tests are primarily set up to run in the deployment pipeline, but they can also be run locally.
Once your local docker environment is up and running, run "docker exec -it [server_container_id] sh" to enter the
server container, then run "npm test". You will likely get an error outside your test suit saying port 5000 is already in use,
just ignore that.
