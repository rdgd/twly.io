FROM node:boron-alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app
RUN npm install
run npm run build

EXPOSE 8080
EXPOSE 8081
CMD [ "npm", "start" ]
