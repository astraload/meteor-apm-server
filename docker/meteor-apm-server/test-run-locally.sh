#!/usr/bin/env bash

################## docker setup ######################
# Smart workdir handling :)
root_directory=`git rev-parse --show-toplevel 2>/dev/null`
if [ -z $root_directory"" ] ; then
  echo -e "\nYou are not in a knotel-rooms project directory."
  echo    "Please cd into it and run this script again."
  echo -e "Aborting...\n"
  exit 1
fi

if [ ! `pwd` == $root_directory ] ; then
  echo -e "\nChanging to webapp directory: $root_directory"
  cd $root_directory
fi

#set up sudo for Linux
sudo=sudo
INGROUP=`groups $USER | grep docker`
if [ "$?" != "1" ]; then
  sudo=
elif [ "$(uname)" == "Darwin" ]; then
  sudo=
fi
################## docker setup ######################

dockerImageName=knotel/meteor-apm-server

dockerTag="latest"
if [ !  -z  $1"" ] ; then
  dockerTag=$1
fi

$sudo docker rm -fv apm-mongo &> /dev/null
$sudo docker run --name apm-mongo -d -p 3001:27017 mongo:3.4 mongod --storageEngine wiredTiger --replSet apmRS
sleep 5
echo Initiating mongo RS
$sudo docker exec -d apm-mongo mongo --eval "rs.initiate()"
sleep 5
$sudo docker rm -fv apm &> /dev/null

#settings consumed by node.js and meteor (example)
MONGO_URL='mongodb://apm-mongo/apm?replicaSet=apmRS'
MONGO_OPLOG_URL='mongodb://apm-mongo/local?replicaSet=apmRS'
MAIL_URL='smtp://apm%40mydomainmail.com:mypassword@smtp.mailgun.org:587'
MAIL_DOMAIN=$HOSTNAME
ENGINE_PORT=11011
API_PORT=7007
ROOT_URL='http://'$HOSTNAME
PORT=3000
ADMIN_PASSWORD=admin2018
METRICS_LIFETIME=604800000

$sudo docker run -d                       \
    --name apm                            \
    --hostname localhost                  \
    -p 3000:3000                          \
    -p 11011:11011                        \
    -p 7007:7007                          \
    -v $root_directory/logs:/logs         \
    -e MONGO_URL=$MONGO_URL               \
    -e MONGO_OPLOG_URL=$MONGO_OPLOG_URL   \
    -e MAIL_URL=$MAIL_URL                 \
    -e MAIL_DOMAIN=$MAIL_DOMAIN           \
    -e ENGINE_PORT=$ENGINE_PORT           \
    -e API_PORT=$API_PORT                 \
    -e ROOT_URL=$ROOT_URL                 \
    -e PORT=$PORT                         \
    -e ADMIN_PASSWORD=$ADMIN_PASSWORD     \
    -e METRICS_LIFETIME=$METRICS_LIFETIME \
    --link apm-mongo:apm-mongo            \
    $dockerImageName:$dockerTag


echo -e "$(tput setaf 2)Don't forget to stop the whole thing with: docker rm -f \`docker ps -aq\`$(tput sgr 0)"
echo -e "\nServer logs can be found in $root_directory/logs\n"
