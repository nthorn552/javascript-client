#!/bin/bash

# replace splitio-commons imports to use ES modules
replace '@nthorn-splitio/splitio-commons/src' '@nthorn-splitio/splitio-commons/cjs' ./lib -r

if [ $? -eq 0 ]
then
  exit 0
else
  exit 1
fi
