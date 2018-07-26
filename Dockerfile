FROM node:10

# Install dos2unix
RUN apt-get update && apt-get install -y apt-utils dos2unix

# Copy source code
COPY . /app

# Change working directory
WORKDIR /app

# Fix files molested by Windows
RUN /bin/bash -c "find . -type f -print0 | xargs -0 dos2unix"
RUN /bin/bash -c "chmod +x install.sh"

# Install dependencies
RUN /bin/bash ./install.sh 

# Expose a port
EXPOSE 9999

# Launch application
CMD /bin/bash -c "npm start && tail -f /dev/null"