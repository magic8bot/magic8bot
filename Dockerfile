FROM node:10-alpine


# Install all build dependencies
# Add bash for debugging purposes
RUN apk update && \
    apk add --virtual build-dependencies \
    build-base \
    dos2unix \
    python2-dev && python2 && \
    apk add bash

# Add mainfest from host
WORKDIR /app
COPY yarn.lock /app/
COPY package.json /app/
COPY tsconfig.json /app/
COPY src /app/src

# Fix files molested by Windows
RUN find . -type f -print0 | xargs -0 dos2unix \
    # fetch and compile ta-lib
    && wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz \
    && tar xvfz ta-lib-0.4.0-src.tar.gz \
    && cd ta-lib \
    && ./configure --prefix=/usr \
    && make \
    && make install \
    && cd .. \
    && rm -rf ta-lib \
    && rm ta-lib-0.4.0-src.tar.gz \
    # Install app dependencies \
    && npm i -g yarn && yarn install  \
    && yarn build \
    # Remove build tools
    && apk del build-dependencies \
    && rm -rf /var/cache/apk/*

# Add app source from host
COPY . /app

# Expose a port
EXPOSE 9999

ENTRYPOINT ["tail", "-f", "/dev/null"]
