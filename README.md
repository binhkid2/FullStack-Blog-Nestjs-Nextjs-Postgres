
# BackEnd
### init

```bash
# 1. Set up PostgreSQL and fill in .env
cp .env.example .env
# edit .env with your DB credentials

# 2. Run DB schema (or let TypeORM synchronize on first start)
psql -U postgres -d nestjs_blog -f database/init.sql

# 3. Seed admin users
npm run seed:admin

# 4. Seed blog posts  
npm run seed:posts
```

###  Compile and run 

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

### Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

 # FrontEnd
 ```bash
# development
$ npm run dev

# build,deploy
$ npm run build

```
### if using both github and git tea
```
git add .
git commit -m "Your commit message"
git push

```

# Deploy 
```
docker compose down --volumes
docker compose build --no-cache
docker compose up --force-recreate
```