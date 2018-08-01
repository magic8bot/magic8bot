########################################################
# Configuration options for various Windows environments
########################################################

# # Check if this is Windows
# ifneq (,$(findstring WINDOWS,$(PATH)))
# WINDOWS := True
# endif

# # Set shell to cmd on windows
# ifdef WINDOWS
# SHELL := C:/Windows/System32/cmd.exe
# endif

# # Don't use sudo on windows
# SUDO := sudo
# ifdef WINDOWS
# SUDO := 
# endif

# # set home dir to user's home on windows running MINGW
# ifdef MSYSTEM
# HOME := $(subst \,/,$(HOME))
# endif

# Get the root dir of this file
ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

# Define the full path to this file
THIS_FILE := $(lastword $(MAKEFILE_LIST))

###########################################################
# Find or create a home for sensitive environment variables
###########################################################

# CREDS=$(HOME)/.credentials
# ifneq ("$(wildcard $(CREDS))","")
# CREDENTIALS := $(CREDS)
# else
# $(info $(shell "mkdir" $(CREDS)))
# endif

#############################
# Argument fix workaround
# To use arguments with make, execute:
# make -- <command> <args>
#############################
%:
	@:
ARGS = $(filter-out $@,$(MAKECMDGOALS))
MAKEFLAGS += --silent

#############################
# magic8bot
#############################


#############################
# Docker commands
#############################

# list available make commands  
list:
	sh -c "echo; $(MAKE) -p no_targets__ | awk -F':' '/^[a-zA-Z0-9][^\$$#\/\\t=]*:([^=]|$$)/ {split(\$$1,A,/ /);for(i in A)print A[i]}' | grep -v '__\$$' | grep -v 'Makefile'| sort"

# build app as defined in docker-compose.yml  
up:
	docker-compose up -d

# stop app without losing data  
stop:
	docker-compose stop

# start app  
start:
	docker-compose start

# build Docker images defined in docker-compose.yml  
build:
	docker build -t magic8bot .

# ALL DATA WILL BE DELETED  
# stop and delete all Docker objects defined in docker-compose.yml  
destroy:
	-docker-compose stop
	-docker-compose rm --force server
	-docker-compose rm --force mongodb
	-docker-compose rm --force adminmongo
	-docker rmi magic8bot:latest
	-docker rmi mongo
	-docker rmi adminmongo
	docker volume prune --force
	docker system prune --force

# show status of Docker objects defined in docker-compose.yml  
state:
	docker-compose ps

# show Docker logs  
logs:
	docker-compose logs $(ARGS)

# open a shell in the application container  
shell:
	docker-compose exec server /bin/sh

# open a shell in the application container as admin user  
shellw:
	docker exec -it -u root $$(docker-compose ps -q server) /bin/sh

# sync clock in container with host's clock
time-sync:
	docker run --rm --privileged alpine hwclock -s
