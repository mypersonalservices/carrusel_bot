#!/bin/bash
# exit when any command fails
set -e

./utils/render_round.py
touch TRASH_FILE_TO_FORCE_STASH
git stash -u
git checkout gh-pages
cp -R ./utils/build/* .
git add devel
# This two lines are commented out because only apply for production deployments
# but this deployment only generates mock devel_data
#git add assets
#git add index.html
git commit -m "Auto deploy from CLI"
git push origin gh-pages
git checkout master
git stash pop
rm TRASH_FILE_TO_FORCE_STASH
