FROM node:boron-alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
RUN apk add --update openssh
RUN apk add --update git
# Bundle app source
COPY . /usr/src/app
RUN npm install
RUN npm run build

CMD ["npm", "start"]
