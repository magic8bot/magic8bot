FROM node:10-alpine

# Install all build dependencies
# Add bash for debugging purposes
RUN apk update && \
    apk add --virtual build-dependencies \
    build-base \
    dos2unix \
    python2-dev && python2 && \
    apk add bash

# Change to app direcotry
WORKDIR /app

# Fetch and compile ta-lib
RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz \
    && tar xvfz ta-lib-0.4.0-src.tar.gz \
    && cd ta-lib \
    && ./configure --prefix=/usr \
    && make \
    && make install \
    && cd .. \
    && rm -rf ta-lib \
    && rm ta-lib-0.4.0-src.tar.gz

# Bind mounts on WSL are flaky 
# so we must copy into a volume.
COPY . /app

# Fix files molested by Windows
RUN find . -type f -print0 | xargs -0 dos2unix \
    && npm i -g yarn \
    && yarn install \
    && yarn build \
    # Remove build tools
    && apk del build-dependencies \
    && rm -rf /var/cache/apk/*

# Expose a port
EXPOSE 9999

ENTRYPOINT ["tail", "-f", "/dev/null"]
