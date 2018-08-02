##########################
# General purpose commands
##########################

##############################################################
# Argument fix workaround
# This allows arguments that start with a hyphen
# to be used with make targets
#
# To use flags with make, execute:
# make -- <command> <flags>
# EG:
# make -- logs --details
#
# The double hyphens can be omitted for arguments
# make <command> <arg>
# EG:
# make logs server
##############################################################
%:
	@:
ARGS = $(filter-out $@,$(MAKECMDGOALS))
MAKEFLAGS += --silent

# Get the root dir of this file
ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

# Define the full path to this file
THIS_FILE := $(lastword $(MAKEFILE_LIST))

# # Find or create a home for sensitive environment variables
# CREDS=$(HOME)/.credentials
# ifneq ("$(wildcard $(CREDS))","")
# CREDENTIALS := $(CREDS)
# else
# $(info $(shell "mkdir" $(CREDS)))
# endif

# # create .env from .env-sample if .env does not exist
# FILE := $(ROOT_DIR)/.env
# FILE_TEMPLATE := $(ROOT_DIR)/.env-sample
# ifneq ("$(wildcard $(FILE))","")
# # $(info "file exists")
# else
# # $(info "file does not exist")
# $(shell "cp" $(FILE_TEMPLATE) $(FILE))
# endif

########################################################
# Quieting make
# The hyphen preceding target commands instructs make to continue after errors
# 2> /dev/null suppresses error messages  
########################################################
# Suppress echoing commands
.SILENT:

# list available make commands
list:
	sh -c "echo; $(MAKE) -p no_targets__ | awk -F':' '/^[a-zA-Z0-9][^\$$#\/\\t=]*:([^=]|$$)/ {split(\$$1,A,/ /);for(i in A)print A[i]}' | grep -v '__\$$' | grep -v 'Makefile'| sort"

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

#############################
# Application commands
#############################

# # Find or create a home for jupyter custom settings
# SETTINGS_DIR=$(HOME)/.magic8bot
# ifneq ("$(wildcard $(SETTINGS_DIR))","")
# else 
# $(info $(shell "mkdir" $(SETTINGS_DIR)))
# endif
# SETTINGS := $(SETTINGS_DIR)

# image name to use in the format org/name:tag
APP_IMAGE=magic8bot/magic8bot

# container name to use for app
APP_NAME=magic8bot

# # named volume used by app
# NAMED_VOL=envs_vol

# Docker command to launch the app.
# leave blank if using docker-compose.yml
# app_up : 
# 	echo "Creating environment. This may take a few minutes..."
# 	docker run -it \
# 	--name $(APP_NAME) \
# 	--mount type=bind,source=${PWD}/projects,target=/root/projects \
# 	--mount type=bind,source=$(SETTINGS),target=/root/user-settings \
# 	--mount type=bind,source=$(CREDENTIALS),target=/root/credentials \
# 	--mount type=volume,source=$(NAMED_VOL),target=/opt/conda/envs \
# 	-p 8888:8888/tcp  $(APP_IMAGE)
# 	echo "Environment created. Jupyter Lab is available at https://localhost:8888"

# rm_app_vols:
# 	docker volume rm -f $(NAMED_VOL) 
#############################
# Docker commands
#############################

# Build app image as defined in Dockerfile
build:
	echo "Building image..."
	docker build -t $(APP_IMAGE) . $(ARGS)

# build app as defined in docker-compose.yml or app_up target
up:
	-$(MAKE) -f $(THIS_FILE) stop
	-docker rm -f $(APP_NAME) 2> /dev/null
	docker-compose up -d 2> /dev/null || $(MAKE) -f $(THIS_FILE) build && $(MAKE) -f $(THIS_FILE) app_up
	
# stop app without losing data  
stop:
	docker-compose stop 2> /dev/null || docker stop $(APP_NAME)

# start app  
start:
	docker-compose start 2> /dev/null || docker start $(APP_NAME)   

# stop and delete all local Docker objects but keep downloaded images
# ALL DATA WILL BE DELETED
rebuild:
	-docker-compose down --rmi local -v --remove-orphans 2> /dev/null
	docker-compose up -d --build 2> /dev/null || $(MAKE) -f $(THIS_FILE) -- build --no-cache

# stop and delete all Docker objects defined in docker-compose.yml  
# ALL DATA WILL BE DELETED 
destroy:
	-docker-compose down --rmi all -v --remove-orphans 2> /dev/null || $(MAKE) -f $(THIS_FILE) stop && docker rm $(APP_NAME)
	-docker rmi -f $(APP_IMAGE)
	-$(MAKE) -f $(THIS_FILE) rm_app_vols
	$(MAKE) -f $(THIS_FILE) prune

# show status of Docker objects defined in docker-compose.yml  
state:
	@echo
	@echo ***Containers***
	docker ps
	@echo
	@echo ***Volumes***
	docker volume ls 
	@echo
	@echo ***Networks***
	docker network ls 

# Prune unused volumes and images
prune :
	docker volume prune -f
	docker image prune -f
	docker system prune -f

# show Docker logs  
logs:
	$(DOCKER_CMD) logs $(ARGS)

# open a shell in the application container  
shell :
	-@$(MAKE) -f $(THIS_FILE) start
	docker exec -i -t $(APP_NAME) /bin/bash

# open a shell in the application container as admin user  
shellw:
	docker exec -it -u root $$(docker-compose ps -q $(APP_NAME)) /bin/sh

# sync clock in container with host's clock
time-sync:
	docker run --rm --privileged alpine hwclock -s
