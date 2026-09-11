# Local trial of the deploy: render the Sanity posts with Node 22 exactly as
# deploy.yml does, then serve the same file set S3 receives through nginx.
# Build context is the repository root:  docker compose -f docker/docker-compose.yml up --build

FROM node:22-alpine AS build
WORKDIR /site
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
# Set INCLUDE_SCHEDULED=1 to preview posts dated in the future. Never in the deploy.
ARG INCLUDE_SCHEDULED=
ENV INCLUDE_SCHEDULED=$INCLUDE_SCHEDULED
ARG SANITY_API_READ_TOKEN=
ENV SANITY_API_READ_TOKEN=$SANITY_API_READ_TOKEN
RUN npm run build:blog
# Same exclude list as the `aws s3 sync` step, so what nginx serves is what the
# bucket would hold.
RUN mkdir /out && tar -cf - \
      --exclude=./.git --exclude=./.github --exclude=./.claude --exclude=./.agents \
      --exclude=./node_modules --exclude=./scripts --exclude=./package.json \
      --exclude=./package-lock.json --exclude=./skills-lock.json --exclude=./.gitignore \
      --exclude=./.DS_Store --exclude=./irrelevent --exclude=./docker \
      . | tar -xf - -C /out

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out /usr/share/nginx/html
