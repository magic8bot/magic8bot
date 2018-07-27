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

# Find or create a home for sensitive environment variables
CREDS=$(HOME)/.credentials
ifneq ("$(wildcard $(CREDS))","")
CREDENTIALS := $(CREDS)
else
$(info $(shell "mkdir" $(CREDS)))
endif

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
# List available targets
#############################
list:
	sh -c "echo; $(MAKE) -p no_targets__ | awk -F':' '/^[a-zA-Z0-9][^\$$#\/\\t=]*:([^=]|$$)/ {split(\$$1,A,/ /);for(i in A)print A[i]}' | grep -v '__\$$' | grep -v 'Makefile'| sort"

#############################
# magic8bot
#############################


#############################
# Docker machine states
#############################
# working
time-sync:
	docker run --rm --privileged alpine hwclock -s

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

build:
	docker build -t magic8bot .

shell:
	docker-compose exec server /bin/sh

up:
	docker-compose up -d 

# todo
start:
	docker-compose start

stop:
	docker-compose stop

state:
	docker-compose ps



shellw:
	docker exec -it -u root $$(docker-compose ps -q server) /bin/sh

logs:
	docker-compose logs $(ARGS)




