FROM node:18
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon-x11-0 \
    libXcomposite1 \
    libXcursor1 \
    libXdamage1 \
    libXext6 \
    libXfixes3 \
    libXi6 \
    libXrandr2 \
    libXrender1 \
    libXtst6 \
    libXss1 \
    libXt6 \
    libxshmfence1 \
    libgtk-3-0 \
    libasound2 \
    libnss3 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxi6 \
    libxtst6 \
    libappindicator1 \
    libappindicator3-1 \
    libsecret-1-0 \
    libgbm1


# Bundle app source
COPY . .

EXPOSE 8081
CMD [ "node", "server.js" ]
