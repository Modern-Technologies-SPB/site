FROM node:18
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

RUN apt-get update && apt-get install -y libnss3

# Bundle app source
COPY . .

EXPOSE 8081
CMD [ "node", "server.js" ]
